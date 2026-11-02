import { z } from "zod";

/**
 * Server-side configuration. Values are read lazily so that `next build`
 * works without secrets; each accessor fails loudly only when used.
 */
const intFromEnv = (fallback: number) =>
  z.preprocess((v) => (v === undefined || v === "" ? fallback : Number(v)), z.number().int().positive());

const serverSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),

  // Unset: Claude is used automatically when ANTHROPIC_API_KEY is present; "heuristic" forces the rule-based engine.
  AI_PROVIDER: z.preprocess((v) => (v === "" ? undefined : v), z.enum(["heuristic", "anthropic"]).optional()),
  ANTHROPIC_API_KEY: z.string().optional(),
  // CV/job parsing (verbatim copy) on a cheap model; suggestions, cover letter and interview prep on a stronger one.
  AI_MODEL_EXTRACT: z.string().default("claude-haiku-5-5"),
  AI_MODEL_WRITE: z.string().default("claude-sonnet-5-5"),
  AI_MAX_INPUT_CHARS: intFromEnv(40000),
  AI_RATE_LIMIT_PER_MINUTE: intFromEnv(10),
  // Cost caps: AI calls per user per day (uploads and job parsing consume no credits), and
  // cover letter / interview prep generations per analysis.
  AI_DAILY_LIMIT: intFromEnv(40),
  AI_EXTRAS_PER_ANALYSIS: intFromEnv(2),

  // Vercel rejects request bodies over 4.5 MB before the route runs, so stay below that.
  UPLOAD_MAX_BYTES: intFromEnv(4_000_000),
  STORE_ORIGINAL_FILES: z.enum(["true", "false"]).default("false"),
  DOCUMENT_RETENTION_DAYS: intFromEnv(30),
  OCR_PROVIDER: z.enum(["none", "http"]).default("none"),
  OCR_HTTP_URL: z.string().url().optional(),
  OCR_HTTP_TOKEN: z.string().optional(),

  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  // "true" enables Stripe Tax on checkout (VAT computed from the customer's address).
  STRIPE_AUTOMATIC_TAX: z.enum(["true", "false"]).default("false"),
  CRON_SECRET: z.string().optional(),
  // NexForge management panel (internal product metrics). All three unset = disabled.
  NEXFORGE_ENDPOINT: z.string().url().optional(),
  NEXFORGE_INGEST_KEY: z.string().optional(),
  NEXFORGE_PSEUDONYM_SECRET: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverSchema>;

let cached: ServerEnv | null = null;

export function env(): ServerEnv {
  if (!cached) cached = serverSchema.parse(process.env);
  return cached;
}

/** Test helper: forget cached env so tests can change process.env. */
export function resetEnvCache() {
  cached = null;
}

export function requireEnv<K extends keyof ServerEnv>(key: K): NonNullable<ServerEnv[K]> {
  const value = env()[key];
  if (value === undefined || value === null || value === "") {
    throw new Error(`Missing required environment variable: ${String(key)}`);
  }
  return value as NonNullable<ServerEnv[K]>;
}

/** Effective AI provider: explicit AI_PROVIDER, otherwise Claude when a key is configured. */
export function aiProvider(e: ServerEnv = env()): "heuristic" | "anthropic" {
  if (e.AI_PROVIDER) return e.AI_PROVIDER === "anthropic" && !e.ANTHROPIC_API_KEY ? "heuristic" : e.AI_PROVIDER;
  return e.ANTHROPIC_API_KEY ? "anthropic" : "heuristic";
}

/**
 * True when the server configuration parses and the keys every request needs are present.
 * Used by /api/health so an invalid production env (e.g. an empty service role key) is not reported as healthy.
 */
export function isServerConfigValid(): boolean {
  try {
    const e = env();
    return Boolean(e.NEXT_PUBLIC_SUPABASE_URL && e.NEXT_PUBLIC_SUPABASE_ANON_KEY && e.SUPABASE_SERVICE_ROLE_KEY);
  } catch {
    return false;
  }
}

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
