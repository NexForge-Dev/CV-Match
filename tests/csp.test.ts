import { describe, expect, it } from "vitest";
import nextConfig, { contentSecurityPolicy } from "../next.config";

function directives(csp: string) {
  return Object.fromEntries(
    csp.split(";").map((d) => d.trim()).filter(Boolean).map((d) => {
      const [name, ...values] = d.split(/\s+/);
      return [name, values];
    }),
  ) as Record<string, string[]>;
}

describe("security headers", () => {
  it("hides the X-Powered-By header", () => {
    expect(nextConfig.poweredByHeader).toBe(false);
  });

  it("sends a Content-Security-Policy on every route", async () => {
    const rules = await nextConfig.headers!();
    const all = rules.find((r) => r.source === "/(.*)");
    expect(all?.headers.map((h) => h.key)).toContain("Content-Security-Policy");
  });

  it("allows Supabase (https + realtime wss) and Turnstile, nothing else external", () => {
    const d = directives(contentSecurityPolicy({ supabaseUrl: "https://abc.supabase.co", dev: false }));
    expect(d["default-src"]).toEqual(["'self'"]);
    expect(d["connect-src"]).toEqual(expect.arrayContaining(["'self'", "https://abc.supabase.co", "wss://abc.supabase.co"]));
    expect(d["script-src"]).toEqual(expect.arrayContaining(["'self'", "https://challenges.cloudflare.com"]));
    expect(d["frame-src"]).toEqual(["https://challenges.cloudflare.com"]);
    expect(d["frame-ancestors"]).toEqual(["'none'"]);
    expect(d["form-action"]).toEqual(["'self'"]);
    expect(d["object-src"]).toEqual(["'none'"]);
    expect(d["base-uri"]).toEqual(["'self'"]);
    expect(d["script-src"]).not.toContain("'unsafe-eval'");
  });

  it("derives ws:// for a local Supabase and allows eval only in development", () => {
    const d = directives(contentSecurityPolicy({ supabaseUrl: "http://127.0.0.1:56521", dev: true }));
    expect(d["connect-src"]).toEqual(expect.arrayContaining(["http://127.0.0.1:56521", "ws://127.0.0.1:56521"]));
    expect(d["script-src"]).toContain("'unsafe-eval'");
  });

  it("ignores a missing or invalid Supabase URL", () => {
    expect(directives(contentSecurityPolicy({ supabaseUrl: undefined, dev: false }))["connect-src"]).toEqual(["'self'", "https://challenges.cloudflare.com"]);
    expect(directives(contentSecurityPolicy({ supabaseUrl: "not a url", dev: false }))["connect-src"]).toEqual(["'self'", "https://challenges.cloudflare.com"]);
  });
});
