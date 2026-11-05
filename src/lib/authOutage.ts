/** True when Supabase Auth could not answer, as opposed to answering that there is no valid session. */
export function isAuthOutage(error: { name?: string; status?: number } | null | undefined): boolean {
  return Boolean(error) && (error!.name === "AuthRetryableFetchError" || (error!.status ?? 0) >= 500);
}
