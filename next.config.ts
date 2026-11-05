import type { NextConfig } from "next";

const TURNSTILE = "https://challenges.cloudflare.com";

/**
 * Content-Security-Policy. Evaluated at build time, so NEXT_PUBLIC_SUPABASE_URL must be set when building.
 * - script-src needs 'unsafe-inline': the App Router inlines its hydration scripts (self.__next_f) and this
 *   app does not use per-request nonces (they would force every page to render dynamically).
 * - style-src needs 'unsafe-inline' for React style attributes.
 * - Supabase is called from the browser (auth) over https, plus wss for Realtime.
 * - Turnstile loads its script and an iframe from challenges.cloudflare.com.
 * - Stripe Checkout/Portal are top-level navigations (window.location), which CSP does not restrict.
 */
export function contentSecurityPolicy({ supabaseUrl, dev }: { supabaseUrl: string | undefined; dev: boolean }): string {
  const supabase: string[] = [];
  try {
    if (supabaseUrl) {
      const { origin } = new URL(supabaseUrl);
      supabase.push(origin, origin.replace(/^http/, "ws"));
    }
  } catch {
    // invalid URL: leave Supabase out (the app reports it as not configured)
  }
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", "'unsafe-inline'", TURNSTILE, ...(dev ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:"],
    "font-src": ["'self'", "data:"],
    "connect-src": ["'self'", ...supabase, TURNSTILE],
    "frame-src": [TURNSTILE],
    "worker-src": ["'self'", "blob:"],
    "frame-ancestors": ["'none'"],
    "form-action": ["'self'"],
    "base-uri": ["'self'"],
    "object-src": ["'none'"],
  };
  return Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(" ")}`)
    .join("; ");
}

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  {
    key: "Content-Security-Policy",
    value: contentSecurityPolicy({ supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL, dev: process.env.NODE_ENV === "development" }),
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Document parsers run only on the server and must not be bundled.
  serverExternalPackages: ["pdf-parse", "mammoth", "pdf-lib", "docx"],
  // Started with fork(), so the file tracer cannot find it on its own.
  outputFileTracingIncludes: { "/api/documents": ["./src/lib/documents/parse-worker.mjs"] },
  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
