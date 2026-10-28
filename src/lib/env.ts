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

  AI_PROVIDER: z.enum(["heuristic", "anthropic"]).default("heuristic"),
  ANTHROPIC_API_KEY: z.string().optional(),
  AI_MODEL: z.string().default("claude-opus-5-5"),
  AI_MAX_INPUT_CHARS: intFromEnv(40000),
  AI_RATE_LIMIT_PER_MINUTE: intFromEnv(10),

  UPLOAD_MAX_BYTES: intFromEnv(5 * 1024 * 1024),
  STORE_ORIGINAL_FILES: z.enum(["true", "false"]).default("false"),
  DOCUMENT_RETENTION_DAYS: intFromEnv(30),
  OCR_PROVIDER: z.enum(["none", "http"]).default("none"),
  OCR_HTTP_URL: z.string().url().optional(),
  OCR_HTTP_TOKEN: z.string().optional(),

  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  CRON_SECRET: z.string().optional(),
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

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
