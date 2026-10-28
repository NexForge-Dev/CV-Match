import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { HttpError } from "@/lib/api";
import type { AiUsage } from "@/lib/ai/provider";

const AI_KINDS = ["analysis", "parse_cv", "extract_requirements", "cover_letter", "interview_prep"];

/** Per-user AI rate limit, enforced server-side from the usage log. */
export async function assertRateLimit(admin: SupabaseClient, userId: string) {
  const since = new Date(Date.now() - 60_000).toISOString();
  const { count, error } = await admin
    .from("usage_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .in("kind", AI_KINDS)
    .gte("created_at", since);
  if (error) throw error;
  if ((count ?? 0) >= env().AI_RATE_LIMIT_PER_MINUTE) throw new HttpError("rate_limited");
}

/** Records metadata only (never content): kind, provider, model, token counts. */
export async function recordUsage(admin: SupabaseClient, userId: string, kind: string, usage: Partial<AiUsage> | null, analysisId?: string) {
  await admin.from("usage_events").insert({
    user_id: userId,
    kind,
    provider: usage?.provider ?? null,
    model: usage?.model ?? null,
    input_tokens: usage?.inputTokens ?? 0,
    output_tokens: usage?.outputTokens ?? 0,
    analysis_id: analysisId ?? null,
  });
}
