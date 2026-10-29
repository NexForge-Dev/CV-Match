import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { HttpError } from "@/lib/api";
import type { AiUsage } from "@/lib/ai/provider";

const AI_KINDS = ["analysis", "parse_cv", "extract_requirements", "cover_letter", "interview_prep"];

async function countAiCalls(admin: SupabaseClient, userId: string, sinceMs: number) {
  const { count, error } = await admin
    .from("usage_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .in("kind", AI_KINDS)
    .gte("created_at", new Date(Date.now() - sinceMs).toISOString());
  if (error) throw error;
  return count ?? 0;
}

/** Per-user AI rate limit (per minute) and daily cost cap, enforced server-side from the usage log. */
export async function assertRateLimit(admin: SupabaseClient, userId: string) {
  if ((await countAiCalls(admin, userId, 60_000)) >= env().AI_RATE_LIMIT_PER_MINUTE) throw new HttpError("rate_limited");
  if ((await countAiCalls(admin, userId, 86_400_000)) >= env().AI_DAILY_LIMIT) throw new HttpError("usage_limit");
}

/**
 * Atomically checks the per-minute and daily caps (and, with an analysis id, the per-analysis cap for
 * this kind) and inserts the usage row before any AI work starts, so parallel requests cannot all pass
 * the check. Returns the row id; fill in the token counts afterwards with `completeUsage`.
 */
export async function reserveUsage(admin: SupabaseClient, userId: string, kind: string, analysisId?: string): Promise<number> {
  const e = env();
  const { data, error } = await admin.rpc("reserve_usage", {
    p_user: userId,
    p_kind: kind,
    p_analysis: analysisId ?? null,
    p_per_minute: e.AI_RATE_LIMIT_PER_MINUTE,
    p_daily: e.AI_DAILY_LIMIT,
    p_per_analysis: analysisId ? e.AI_EXTRAS_PER_ANALYSIS : null,
  });
  if (error) {
    if (error.message === "rate_limited" || error.message === "usage_limit") throw new HttpError(error.message);
    throw error;
  }
  return data as number;
}

/** Stores the metadata of the AI call (never content) on a reserved usage row. */
export async function completeUsage(admin: SupabaseClient, usageId: number, usage: Partial<AiUsage> | null) {
  await admin
    .from("usage_events")
    .update({ provider: usage?.provider ?? null, model: usage?.model ?? null, input_tokens: usage?.inputTokens ?? 0, output_tokens: usage?.outputTokens ?? 0 })
    .eq("id", usageId);
}
