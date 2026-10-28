"use client";

import type { Dictionary } from "@/lib/i18n/dictionaries";

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string; detail?: string };

/** Fetch wrapper for our JSON API; errors come back as stable codes. */
export async function api<T = unknown>(url: string, init: RequestInit & { json?: unknown } = {}): Promise<ApiResult<T>> {
  const { json, ...rest } = init;
  try {
    const res = await fetch(url, {
      ...rest,
      headers: json !== undefined ? { "content-type": "application/json", ...(rest.headers ?? {}) } : rest.headers,
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    });
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) return { ok: false, error: (body.error as string) ?? "server_error", detail: body.detail as string | undefined };
    return { ok: true, data: body as T };
  } catch {
    return { ok: false, error: "server_error" };
  }
}

/** Human message for an API error code (detail codes such as placeholder_left take precedence). */
export function errorMessage(t: Dictionary, error: string, detail?: string): string {
  const all = t.errors as Record<string, string>;
  if (detail && all[detail]) return all[detail];
  return all[error] ?? t.errors.generic;
}
