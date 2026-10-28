import "server-only";
import { NextResponse } from "next/server";
import type { ZodType } from "zod";
import type { User } from "@supabase/supabase-js";
import { getApiUser } from "@/lib/auth";
import { log } from "@/lib/log";
import { createClient } from "@/lib/supabase/server";

export type ErrorCode =
  | "unauthorized"
  | "invalid_input"
  | "not_found"
  | "forbidden"
  | "payment_required"
  | "feature_locked"
  | "rate_limited"
  | "upload_invalid"
  | "extraction_failed"
  | "conflict"
  | "not_configured"
  | "server_error";

const STATUS: Record<ErrorCode, number> = {
  unauthorized: 401,
  invalid_input: 400,
  not_found: 404,
  forbidden: 403,
  payment_required: 402,
  feature_locked: 403,
  rate_limited: 429,
  upload_invalid: 400,
  extraction_failed: 422,
  conflict: 409,
  not_configured: 503,
  server_error: 500,
};

export function apiError(code: ErrorCode, detail?: string) {
  return NextResponse.json({ error: code, detail }, { status: STATUS[code] });
}

export class HttpError extends Error {
  constructor(
    public code: ErrorCode,
    public detail?: string,
  ) {
    super(code);
  }
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Wraps a route handler: authenticates, maps thrown HttpErrors, never leaks internals. */
export function withUser<Ctx>(handler: (req: Request, ctx: Ctx, auth: { user: User; supabase: Supabase }) => Promise<Response>) {
  return async (req: Request, ctx: Ctx) => {
    try {
      const { user, supabase } = await getApiUser();
      if (!user) return apiError("unauthorized");
      return await handler(req, ctx, { user, supabase });
    } catch (err) {
      if (err instanceof HttpError) return apiError(err.code, err.detail);
      log.error("api.unhandled", { path: new URL(req.url).pathname, error: err instanceof Error ? err.message.slice(0, 80) : "unknown" });
      return apiError("server_error");
    }
  };
}

export async function parseJson<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new HttpError("invalid_input", "invalid_json");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new HttpError("invalid_input", parsed.error.issues[0]?.path.join(".") || "body");
  return parsed.data;
}

export const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function assertUuid(id: string) {
  if (!uuidLike.test(id)) throw new HttpError("not_found");
}
