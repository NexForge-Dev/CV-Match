/**
 * For pages: a failed query must reach the error boundary. Read as empty data, an outage looks like
 * "no credits left" or a 404 to a paying customer.
 */
export function must<R extends { error: unknown }>(result: R): R {
  if (result.error) throw new Error(`database_error:${(result.error as { code?: string }).code ?? "unknown"}`);
  return result;
}
