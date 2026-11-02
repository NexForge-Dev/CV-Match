import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/analytics", () => ({ analytics: { step: () => {}, signupCompleted: () => {} } }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      exchangeCodeForSession: async (code: string) => ({ error: code === "good" ? null : new Error("bad") }),
      verifyOtp: async () => ({ error: null }),
      getUser: async () => ({ data: { user: null } }),
    },
  }),
}));

async function callback(query: string) {
  const { GET } = await import("@/app/auth/callback/route");
  const res = await GET(new NextRequest(`https://cvmatch.test/auth/callback?${query}`));
  return res.headers.get("location");
}

describe("auth callback redirects", () => {
  it("keeps the query string of a same-origin next path", async () => {
    expect(await callback(`code=good&next=${encodeURIComponent("/billing?plan=pack_10")}`)).toBe("https://cvmatch.test/billing?plan=pack_10");
  });
  it("never leaves the site and reports broken links on the login page", async () => {
    expect(await callback(`code=good&next=${encodeURIComponent("//evil.com/x")}`)).toBe("https://cvmatch.test/dashboard");
    expect(await callback("code=bad")).toBe("https://cvmatch.test/login?error=link");
  });
  it("sends password recovery to the reset page", async () => {
    expect(await callback("token_hash=t&type=recovery")).toBe("https://cvmatch.test/reset-password");
  });
});
