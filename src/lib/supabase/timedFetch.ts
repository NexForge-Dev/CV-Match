/** Supabase calls have no timeout of their own, so a slow database would hold every page open. */
export const SUPABASE_TIMEOUT_MS = 6000;

export function timedFetch(timeoutMs = SUPABASE_TIMEOUT_MS): typeof fetch {
  return async (input, init) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    init?.signal?.addEventListener("abort", () => controller.abort());
    try {
      return await fetch(input, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  };
}
