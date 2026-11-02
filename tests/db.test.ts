import { beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
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
  // Every migration in order, except Storage (the storage schema is not stubbed here).
  const dir = path.join(__dirname, "../supabase/migrations");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql") && !f.includes("storage")).sort()) {
    await db.exec(readFileSync(path.join(dir, file), "utf8"));
  }
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

  it("server-managed columns and rows cannot be written by users", async () => {
    const [{ id: docA }] = await as<{ id: string }>(
      "service",
      `insert into public.documents (user_id, file_name, mime_type, kind, size_bytes, storage_path, extraction_status) values ($1, 'cv.pdf', 'application/pdf', 'pdf', 10, $2, 'ok') returning id`,
      [A, `${A}/x.pdf`],
    );
    // storage_path drives server-side file deletion: users must not be able to point it at someone else's file.
    await expect(as(A, `update public.documents set storage_path = $1 where id = $2`, [`${B}/victim.pdf`, docA])).rejects.toThrow(/permission denied/);
    await as(A, `update public.documents set extracted_text = null where id = $1`, [docA]); // allowed: own text
    await expect(as(B, `insert into public.documents (user_id, file_name, mime_type, kind, size_bytes, extraction_status) values ($1, 'x', 'x', 'pdf', 1, 'ok')`, [B])).rejects.toThrow(/row-level security/);

    const [{ id: jobA }] = await as<{ id: string }>(A, "select id from public.job_descriptions limit 1");
    await expect(
      as(A, `insert into public.analyses (user_id, resume_id, resume_version_id, job_id, language, provider, tier, credit_source) values ($1, $2, $3, $4, 'en', 'x', 'full', 'x')`, [A, resumeA, versionA, jobA]),
    ).rejects.toThrow(/row-level security/);
    const [{ id: analysisA }] = await as<{ id: string }>(
      "service",
      `insert into public.analyses (user_id, resume_id, resume_version_id, job_id, language, score, provider, tier, credit_source) values ($1, $2, $3, $4, 'en', 40, 'heuristic', 'free', 'free_credit') returning id`,
      [A, resumeA, versionA, jobA],
    );
    await as(A, `update public.analyses set score = 100, tier = 'full' where id = $1`, [analysisA]); // no update policy: no-op
    const [a] = await as<{ score: number; tier: string }>(A, "select score, tier from public.analyses where id = $1", [analysisA]);
    expect(a).toEqual({ score: 40, tier: "free" });

    const [{ id: sugA }] = await as<{ id: string }>(
      "service",
      `insert into public.suggestions (analysis_id, user_id, kind, section, suggested_text) values ($1, $2, 'summary', 'summary', 'grounded text') returning id`,
      [analysisA, A],
    );
    await expect(as(A, `update public.suggestions set suggested_text = 'invented' where id = $1`, [sugA])).rejects.toThrow(/permission denied/);
    await as(A, `update public.suggestions set status = 'accepted' where id = $1`, [sugA]);
    await as(B, `update public.suggestions set status = 'rejected' where id = $1`, [sugA]); // other user: no rows
    const [s] = await as<{ status: string }>(A, "select status from public.suggestions where id = $1", [sugA]);
    expect(s.status).toBe("accepted");

    // B cannot attach one of its versions to A's analysis.
    const [{ id: resumeB }] = await as<{ id: string }>(B, `insert into public.resumes (user_id, title) values ($1, 'B cv') returning id`, [B]);
    await expect(
      as(B, `insert into public.resume_versions (resume_id, user_id, version_number, origin, data, analysis_id) values ($1, $2, 1, 'suggestions', '{}', $3)`, [resumeB, B, analysisA]),
    ).rejects.toThrow(/row-level security/);
  });

  it("anonymous users see only active plans", async () => {
    const plans = await as<{ id: string }>(null, "select id from public.plans order by sort");
    expect(plans.map((p) => p.id)).toEqual(["free", "pack_10", "pro_monthly", "pro_quarterly"]);
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

  it("subscription quota ignores analyses paid with credits in the same period", async () => {
    // A already spent a paid credit above (in this period). That must not reduce the subscription quota.
    await as("service", `insert into public.subscriptions (user_id, plan_id, status, current_period_start, current_period_end) values ($1, 'pro_monthly', 'active', now() - interval '1 day', now() + interval '29 days')`, [A]);
    const sources: string[] = [];
    for (let i = 0; i < 3; i++) {
      const [r] = await as<{ source: string }>("service", "select * from public.consume_analysis_credit($1)", [A]);
      sources.push(r.source);
    }
    expect(sources).toEqual(["subscription", "subscription", "paid_credit"]);
    const [summary] = await as<{ period_used: number; period_included: number }>(A, "select * from public.credit_summary()");
    expect(summary).toMatchObject({ period_used: 2, period_included: 2 });
  });

  it("concurrent consumption never overspends", async () => {
    const C = "33333333-3333-3333-3333-333333333333";
    await db.exec(`insert into auth.users (id, email) values ('${C}', 'c@test.dev')`); // 1 free credit
    const results = await Promise.all(
      Array.from({ length: 5 }, () => as<{ allowed: boolean }>("service", "select * from public.consume_analysis_credit($1)", [C])),
    );
    expect(results.filter((r) => r[0].allowed)).toHaveLength(1);
    const [{ balance }] = await as<{ balance: number }>("service", "select coalesce(sum(delta),0)::int as balance from public.credit_ledger where user_id = $1", [C]);
    expect(balance).toBe(0);
  });

  it("paid credits take the features of the active pack", async () => {
    await as("service", `update public.plans set features = features || '{"cover_letter": false}' where id = 'pack_5'`);
    const D = "44444444-4444-4444-4444-444444444444";
    await db.exec(`insert into auth.users (id, email) values ('${D}', 'd@test.dev')`);
    await as("service", `insert into public.credit_ledger (user_id, delta, credit_type, reason, external_ref) values ($1, 1, 'paid', 'pack_purchase', 'cs_test_d')`, [D]);
    const [r] = await as<{ features: { cover_letter: boolean } }>("service", "select * from public.consume_analysis_credit($1)", [D]);
    expect(r.features.cover_letter).toBe(true);
  });

  it("orphan analyses (function killed before refunding) get their credit back, once", async () => {
    const E = "55555555-5555-5555-5555-555555555555";
    await db.exec(`insert into auth.users (id, email) values ('${E}', 'e@test.dev')`); // 1 free credit
    const [r] = await as<{ allowed: boolean; usage_event_id: number }>("service", "select * from public.consume_analysis_credit($1)", [E]);
    expect(r.allowed).toBe(true);
    // Too recent: still running.
    expect((await as<{ n: number }>("service", "select public.reconcile_orphan_analyses() as n"))[0].n).toBe(0);
    await as("service", `update public.usage_events set created_at = created_at - interval '1 hour' where id = $1`, [r.usage_event_id]);
    await as("service", `update public.credit_ledger set created_at = created_at - interval '1 hour' where user_id = $1 and reason = 'analysis'`, [E]);
    expect((await as<{ n: number }>("service", "select public.reconcile_orphan_analyses() as n"))[0].n).toBe(1);
    expect((await as<{ n: number }>("service", "select public.reconcile_orphan_analyses() as n"))[0].n).toBe(0);
    const [{ balance }] = await as<{ balance: number }>("service", "select coalesce(sum(delta),0)::int as balance from public.credit_ledger where user_id = $1", [E]);
    expect(balance).toBe(1);
    await expect(as(E, "select public.reconcile_orphan_analyses()")).rejects.toThrow(/permission denied/);
  });

  it("deleting the auth user removes all their data", async () => {
    // In Supabase the Auth server performs this delete (auth.admin.deleteUser).
    await db.query("delete from auth.users where id = $1", [A]);
    const [{ count }] = await as<{ count: number }>("service", "select (select count(*) from public.resumes where user_id = $1) + (select count(*) from public.credit_ledger where user_id = $1) + (select count(*) from public.profiles where id = $1) as count", [A]);
    expect(Number(count)).toBe(0);
  });
});

describe("AI usage reservation", () => {
  const U = "66666666-6666-6666-6666-666666666666";
  const reserve = (kind: string, analysis: string | null, perMinute: number, daily: number, perAnalysis: number | null) =>
    as<{ id: number }>("service", "select public.reserve_usage($1, $2, $3, $4, $5, $6) as id", [U, kind, analysis, perMinute, daily, perAnalysis]);

  beforeAll(async () => {
    await db.exec(`insert into auth.users (id, email) values ('${U}', 'u@test.dev')`);
  });

  it("is server-only", async () => {
    await expect(as(U, "select public.reserve_usage($1, 'parse_cv', null, 10, 10, null)", [U])).rejects.toThrow(/permission denied/);
  });

  it("enforces the per-minute cap by inserting the row under the lock", async () => {
    await reserve("parse_cv", null, 2, 100, null);
    await reserve("extract_requirements", null, 2, 100, null);
    await expect(reserve("parse_cv", null, 2, 100, null)).rejects.toThrow(/rate_limited/);
  });

  it("enforces the daily cap", async () => {
    await expect(reserve("parse_cv", null, 100, 2, null)).rejects.toThrow(/usage_limit/);
  });

  it("enforces the per-analysis cap for extras", async () => {
    const analysis = "77777777-7777-7777-7777-777777777777";
    await reserve("cover_letter", analysis, 100, 100, 1);
    await expect(reserve("cover_letter", analysis, 100, 100, 1)).rejects.toThrow(/usage_limit/);
    // A different extra on the same analysis has its own cap.
    await reserve("interview_prep", analysis, 100, 100, 1);
  });

  it("parallel requests cannot exceed the cap", async () => {
    const V = "88888888-8888-8888-8888-888888888888";
    await db.exec(`insert into auth.users (id, email) values ('${V}', 'v@test.dev')`);
    const results = await Promise.allSettled(
      Array.from({ length: 8 }, () => as("service", "select public.reserve_usage($1, 'cover_letter', null, 3, 100, null)", [V])),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(3);
  });
});

describe("advisor fixes (20261102000006_advisors.sql)", () => {
  const ADVISORS = path.join(__dirname, "../supabase/migrations/20261102000006_advisors.sql");

  it("every public RLS policy evaluates auth.uid() once per statement (initplan)", async () => {
    const policies = await db.query<{ policyname: string; qual: string | null; with_check: string | null }>(
      "select policyname, qual, with_check from pg_policies where schemaname = 'public'",
    );
    // 23 policies as before (replaced, not added), minus documents_delete dropped by 20261103000008_audit.sql.
    expect(policies.rows.length).toBe(22);
    for (const p of policies.rows) {
      const expr = `${p.qual ?? ""} ${p.with_check ?? ""}`;
      // Every auth.uid() call is wrapped in a scalar subquery: "( SELECT auth.uid() AS uid)".
      const bare = expr.replace(/\(\s*SELECT auth\.uid\(\)( AS uid)?\s*\)/gi, "");
      expect(bare, p.policyname).not.toMatch(/auth\.uid\(\)/);
    }
  });

  it("touch_updated_at has a fixed search_path and still stamps updated_at", async () => {
    const [{ proconfig }] = (await db.query<{ proconfig: string[] | null }>("select proconfig from pg_proc where proname = 'touch_updated_at'")).rows;
    expect(proconfig).toContain('search_path=""');
    const F = "99999999-9999-9999-9999-999999999999";
    await db.exec(`insert into auth.users (id, email) values ('${F}', 'f@test.dev')`);
    await as("service", "update public.profiles set updated_at = now() - interval '1 day' where id = $1", [F]);
    // The trigger runs as the updating user: the empty search_path must not break it.
    await as(F, "update public.profiles set full_name = 'Fer' where id = $1", [F]);
    const [p] = await as<{ fresh: boolean }>(F, "select updated_at > now() - interval '1 minute' as fresh from public.profiles where id = $1", [F]);
    expect(p.fresh).toBe(true);
  });

  it("applies cleanly a second time (idempotent)", async () => {
    await expect(db.exec(readFileSync(ADVISORS, "utf8"))).resolves.toBeDefined();
    expect((await as(B, "select * from public.resumes where user_id <> $1", [B])).length).toBe(0);
  });
});

describe("audit limits on user-writable columns (20261103000008_audit.sql)", () => {
  const G = "77777777-7777-7777-7777-777777777777";
  beforeAll(async () => {
    await db.exec(`insert into auth.users (id, email) values ('${G}', 'g@test.dev')`);
  });

  it("a job link must be http(s) and requirements a bounded array", async () => {
    const job = `insert into public.job_descriptions (user_id, raw_text, url, requirements) values ($1, repeat('job text ', 10), $2, $3::jsonb)`;
    await expect(as(G, job, [G, "javascript:alert(1)", "[]"])).rejects.toThrow(/job_descriptions_url_http/);
    await expect(as(G, job, [G, "https://jobs.example/1", '{"a":1}'])).rejects.toThrow(/job_descriptions_requirements_array/);
    await expect(as(G, job, [G, "", JSON.stringify(Array.from({ length: 101 }, () => ({})))])).rejects.toThrow(/job_descriptions_requirements_array/);
    await expect(as(G, job, [G, "https://jobs.example/1", "[]"])).resolves.toBeDefined();
  });

  it("CV versions must be objects and target locations bounded", async () => {
    const [{ id: resume }] = await as<{ id: string }>(G, `insert into public.resumes (user_id, title) values ($1, 'G') returning id`, [G]);
    await expect(
      as(G, `insert into public.resume_versions (resume_id, user_id, version_number, origin, data) values ($1, $2, 1, 'manual', '[]')`, [resume, G]),
    ).rejects.toThrow(/resume_versions_data_object/);
    await expect(as(G, `update public.profiles set target_locations = array_fill('x'::text, array[21]) where id = $1`, [G])).rejects.toThrow(/profiles_target_locations_bounded/);
  });

  it("users cannot delete documents directly (the server removes the stored file first)", async () => {
    const [{ id }] = await as<{ id: string }>(
      "service",
      `insert into public.documents (user_id, file_name, mime_type, kind, size_bytes, storage_path, extraction_status) values ($1, 'cv.pdf', 'application/pdf', 'pdf', 10, $2, 'ok') returning id`,
      [G, `${G}/cv.pdf`],
    );
    await expect(as(G, "delete from public.documents where id = $1", [id])).rejects.toThrow(/permission denied/);
    expect(await as(G, "select id from public.documents where id = $1", [id])).toHaveLength(1);
  });

  it("applies cleanly a second time (idempotent)", async () => {
    await expect(db.exec(readFileSync(path.join(__dirname, "../supabase/migrations/20261103000008_audit.sql"), "utf8"))).resolves.toBeDefined();
  });
});
