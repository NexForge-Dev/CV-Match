import { beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Runs the real migration in an in-process Postgres (PGlite) with a minimal
 * stand-in for Supabase's auth schema and roles, then verifies RLS isolation
 * and the credit functions.
 */
const SUPABASE_STUB = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema public to anon, authenticated, service_role;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
`;

const A = "11111111-1111-1111-1111-111111111111";
const B = "22222222-2222-2222-2222-222222222222";

let db: PGlite;

async function as<T = Record<string, unknown>>(user: string | null, sql: string, params: unknown[] = []) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${user ?? ""}', false);`);
  await db.exec(user === "service" ? "set role service_role" : user ? "set role authenticated" : "set role anon");
  try {
    return (await db.query<T>(sql, params)).rows;
  } finally {
    await db.exec("reset role");
  }
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(SUPABASE_STUB);
  const migration = readFileSync(path.join(__dirname, "../supabase/migrations/20261028000001_schema.sql"), "utf8");
  await db.exec(migration);
  await db.exec(`insert into auth.users (id, email, raw_user_meta_data) values ('${A}', 'a@test.dev', '{"full_name":"Ana"}'), ('${B}', 'b@test.dev', '{}');`);
}, 60000);

describe("signup trigger", () => {
  it("creates a profile and grants the free credit", async () => {
    const rows = await as<{ free_credits: number }>(A, "select * from public.credit_summary()");
    expect(rows[0].free_credits).toBe(1);
    const profiles = await as<{ full_name: string }>(A, "select full_name from public.profiles");
    expect(profiles).toEqual([{ full_name: "Ana" }]);
  });
});

describe("row level security isolates accounts", () => {
  let resumeA: string;
  let versionA: string;

  beforeAll(async () => {
    [{ id: resumeA }] = await as<{ id: string }>(A, `insert into public.resumes (user_id, title) values ($1, 'A cv') returning id`, [A]);
    [{ id: versionA }] = await as<{ id: string }>(
      A,
      `insert into public.resume_versions (resume_id, user_id, version_number, origin, data) values ($1, $2, 1, 'import', '{}') returning id`,
      [resumeA, A],
    );
    await as(A, `insert into public.job_descriptions (user_id, raw_text) values ($1, repeat('job text ', 10))`, [A]);
  });

  it("B cannot read A's data", async () => {
    expect(await as(B, "select * from public.resumes")).toHaveLength(0);
    expect(await as(B, "select * from public.resume_versions")).toHaveLength(0);
    expect(await as(B, "select * from public.job_descriptions")).toHaveLength(0);
    expect(await as(B, "select * from public.profiles where id = $1", [A])).toHaveLength(0);
    expect(await as(A, "select * from public.resumes")).toHaveLength(1);
  });

  it("B cannot write rows for A or attach versions to A's resume", async () => {
    await expect(as(B, `insert into public.resumes (user_id, title) values ($1, 'x')`, [A])).rejects.toThrow(/row-level security/);
    await expect(
      as(B, `insert into public.resume_versions (resume_id, user_id, version_number, origin, data) values ($1, $2, 2, 'manual', '{}')`, [resumeA, B]),
    ).rejects.toThrow(/row-level security/);
    await as(B, "delete from public.resumes where id = $1", [resumeA]);
    expect(await as(A, "select * from public.resumes")).toHaveLength(1);
  });

  it("versions are immutable for users", async () => {
    await as(A, `update public.resume_versions set data = '{"hacked":true}' where id = $1`, [versionA]);
    const [row] = await as<{ data: unknown }>(A, "select data from public.resume_versions where id = $1", [versionA]);
    expect(row.data).toEqual({});
  });

  it("anonymous users see only active plans", async () => {
    const plans = await as<{ id: string }>(null, "select id from public.plans order by sort");
    expect(plans.map((p) => p.id)).toEqual(["free", "pack_5", "pro_monthly"]);
    expect(await as(null, "select * from public.resumes")).toHaveLength(0);
  });
});

describe("billing integrity", () => {
  it("users cannot grant themselves credits, subscriptions or analyses", async () => {
    await expect(as(A, `insert into public.credit_ledger (user_id, delta, credit_type, reason) values ($1, 100, 'paid', 'admin_adjustment')`, [A])).rejects.toThrow(/row-level security/);
    await expect(as(A, `insert into public.subscriptions (user_id, plan_id, status, current_period_end) values ($1, 'pro_monthly', 'active', now() + interval '1 year')`, [A])).rejects.toThrow(/row-level security/);
    await expect(as(A, "select * from public.consume_analysis_credit($1)", [A])).rejects.toThrow(/permission denied/);
  });

  it("consumes free credit once, then refuses; refunds work", async () => {
    const first = await as<{ allowed: boolean; tier: string; source: string; ledger_id: number; usage_event_id: number }>("service", "select * from public.consume_analysis_credit($1)", [B]);
    expect(first[0]).toMatchObject({ allowed: true, tier: "free", source: "free_credit" });
    const second = await as<{ allowed: boolean; source: string }>("service", "select * from public.consume_analysis_credit($1)", [B]);
    expect(second[0]).toMatchObject({ allowed: false, source: "no_credits" });

    await as("service", "select public.refund_analysis_credit($1, $2, $3)", [B, first[0].usage_event_id, first[0].ledger_id]);
    await as("service", "select public.refund_analysis_credit($1, $2, $3)", [B, first[0].usage_event_id, first[0].ledger_id]); // idempotent
    const [summary] = await as<{ free_credits: number }>(B, "select * from public.credit_summary()");
    expect(summary.free_credits).toBe(1);
  });

  it("paid credits are used before free ones and grant the full tier", async () => {
    await as("service", `insert into public.credit_ledger (user_id, delta, credit_type, reason, external_ref) values ($1, 5, 'paid', 'pack_purchase', 'cs_test_1')`, [A]);
    await expect(as("service", `insert into public.credit_ledger (user_id, delta, credit_type, reason, external_ref) values ($1, 5, 'paid', 'pack_purchase', 'cs_test_1')`, [A])).rejects.toThrow(/duplicate/);
    const [r] = await as<{ tier: string; source: string; features: { cover_letter: boolean } }>("service", "select * from public.consume_analysis_credit($1)", [A]);
    expect(r).toMatchObject({ tier: "full", source: "paid_credit" });
    expect(r.features.cover_letter).toBe(true);
    const [summary] = await as<{ paid_credits: number; free_credits: number }>(A, "select * from public.credit_summary()");
    expect(summary).toMatchObject({ paid_credits: 4, free_credits: 1 });
  });

  it("an active subscription uses its period quota", async () => {
    await as("service", `update public.plans set analyses_included = 2 where id = 'pro_monthly'`);
    await as("service", `insert into public.subscriptions (user_id, plan_id, status, current_period_start, current_period_end) values ($1, 'pro_monthly', 'active', now() - interval '1 day', now() + interval '29 days')`, [B]);
    const sources: string[] = [];
    for (let i = 0; i < 3; i++) {
      const [r] = await as<{ source: string }>("service", "select * from public.consume_analysis_credit($1)", [B]);
      sources.push(r.source);
    }
    // 2 from the subscription quota, then the remaining free credit.
    expect(sources).toEqual(["subscription", "subscription", "free_credit"]);
  });

  it("deleting the auth user removes all their data", async () => {
    // In Supabase the Auth server performs this delete (auth.admin.deleteUser).
    await db.query("delete from auth.users where id = $1", [A]);
    const [{ count }] = await as<{ count: number }>("service", "select (select count(*) from public.resumes where user_id = $1) + (select count(*) from public.credit_ledger where user_id = $1) + (select count(*) from public.profiles where id = $1) as count", [A]);
    expect(Number(count)).toBe(0);
  });
});
