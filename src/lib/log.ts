/**
 * Privacy-aware logger. CVs contain personal data, so we never log document
 * content: only ids, sizes, codes and durations. Any string field longer than
 * a short threshold is replaced by its length.
 */
type Fields = Record<string, unknown>;

const MAX_STRING = 80;
const BLOCKED_KEYS = /text|content|cv|resume|body|email|phone|name|description|prompt/i;

export function redact(fields: Fields): Fields {
  const out: Fields = {};
  for (const [key, value] of Object.entries(fields)) {
    if (typeof value === "string") {
      out[key] = BLOCKED_KEYS.test(key) || value.length > MAX_STRING ? `[redacted:${value.length}]` : value;
    } else if (value && typeof value === "object") {
      out[key] = "[object]";
    } else {
      out[key] = value;
    }
  }
  return out;
}

/** What a caught error says, safely: a message for Error, the code for a Supabase or Stripe error object. */
export function errorSummary(err: unknown): string {
  if (err instanceof Error) return err.message.slice(0, MAX_STRING);
  const code = (err as { code?: unknown } | null)?.code;
  return typeof code === "string" && code ? code.slice(0, MAX_STRING) : "unknown";
}

function write(level: "info" | "warn" | "error", event: string, fields: Fields = {}) {
  if (process.env.NODE_ENV === "test") return;
  const line = JSON.stringify({ level, event, ts: new Date().toISOString(), ...redact(fields) });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

export const log = {
  info: (event: string, fields?: Fields) => write("info", event, fields),
  warn: (event: string, fields?: Fields) => write("warn", event, fields),
  error: (event: string, fields?: Fields) => write("error", event, fields),
};
