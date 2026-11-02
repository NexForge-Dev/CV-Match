import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetEnvCache } from "@/lib/env";

const dbResult = { error: null as unknown };
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: () => ({ select: () => ({ limit: async () => dbResult }) }),
  }),
}));

const saved = { ...process.env };
const GOOD = {
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:56521",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
  SUPABASE_SERVICE_ROLE_KEY: "service",
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
};

async function health(vars: Record<string, string | undefined>) {
  process.env = { ...saved, ...GOOD, ...vars };
  resetEnvCache();
  const { GET } = await import("@/app/api/health/route");
  const res = await GET();
  return { status: res.status, body: await res.json() };
}

beforeEach(() => {
  dbResult.error = null;
});
afterEach(() => {
  process.env = { ...saved };
  resetEnvCache();
});

describe("/api/health", () => {
  it("is ok when the database answers and the server config is valid", async () => {
    expect(await health({})).toEqual({ status: 200, body: { ok: true, database: true, config: true } });
  });

  it("fails when the server config is invalid even if the database answers", async () => {
    expect(await health({ SUPABASE_SERVICE_ROLE_KEY: "" })).toEqual({ status: 503, body: { ok: false, database: true, config: false } });
    expect(await health({ SUPABASE_SERVICE_ROLE_KEY: undefined })).toEqual({ status: 503, body: { ok: false, database: true, config: false } });
    expect(await health({ NEXT_PUBLIC_APP_URL: "not a url" })).toEqual({ status: 503, body: { ok: false, database: true, config: false } });
  });

  it("fails when the database does not answer", async () => {
    dbResult.error = { message: "down" };
    expect(await health({})).toEqual({ status: 503, body: { ok: false, database: false, config: true } });
  });

  it("reports only booleans", async () => {
    const { body } = await health({ SUPABASE_SERVICE_ROLE_KEY: "" });
    expect(Object.values(body).every((v) => typeof v === "boolean")).toBe(true);
  });
});
