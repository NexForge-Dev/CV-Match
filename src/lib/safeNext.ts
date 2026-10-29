/**
 * Same-origin path to continue to after login/signup. Rejects protocol-relative
 * URLs ("//evil.com"), backslashes (browsers read "/\evil.com" as "//evil.com")
 * and control characters; anything else falls back.
 */
export function safeNextPath(next: string | null | undefined, fallback: string): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return fallback;
  if (/[\\\u0000-\u001f\u007f]/.test(next)) return fallback;
  return next;
}
