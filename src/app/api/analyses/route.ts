import { analytics } from "@/lib/analytics";
import { NextResponse } from "next/server";
import { z } from "zod";
import { HttpError, parseJson, uuidLike, withUser } from "@/lib/api";
import { log } from "@/lib/log";
import { cvLanguageSchema } from "@/lib/cv/schema";
import { requirementSchema } from "@/lib/analysis/requirements";
import { computeScore, matchRequirements } from "@/lib/analysis/match";
import { analyze, getProvider } from "@/lib/ai/pipeline";
import { planFeaturesSchema } from "@/lib/billing/plans";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadVersion } from "@/lib/server/resumes";
import { assertRateLimit } from "@/lib/server/usage";

export const runtime = "nodejs";
export const maxDuration = 120;

const schema = z.object({
  resumeVersionId: z.string().regex(uuidLike),
  jobId: z.string().regex(uuidLike),
  language: cvLanguageSchema,
});

const MAX_REQUIREMENTS = 60;

type CreditRow = { allowed: boolean; tier: "free" | "full" | null; source: string; usage_event_id: number | null; ledger_id: number | null; features: unknown };

/**
 * Runs an analysis. Entitlement is decided ONLY on the server: a credit is
 * consumed atomically in the database (subscription quota -> paid -> free),
 * and the tier/features stored on the analysis come from that function,
 * never from the request.
 */
export const POST = withUser(async (req, _ctx, { user, supabase }) => {
  const body = await parseJson(req, schema);

  // Ownership is enforced by RLS: another user's ids simply return nothing.
  const version = await loadVersion(supabase, body.resumeVersionId);
  const { data: job } = await supabase.from("job_descriptions").select("id, raw_text, requirements").eq("id", body.jobId).maybeSingle();
  if (!job) throw new HttpError("not_found");
  // requirements is user-writable through the Data API: cap it like the job routes do.
  const requirements = z.array(requirementSchema).parse(job.requirements ?? []).slice(0, MAX_REQUIREMENTS);

  // Matching is deterministic and cheap: refuse (without charging) a job whose
  // requirements cannot produce a meaningful index instead of showing a misleading score.
  if (!requirements.length) throw new HttpError("invalid_input", "no_requirements");
  if (computeScore(requirements, matchRequirements(version.cv, requirements)).score === null) {
    throw new HttpError("invalid_input", "no_scorable_requirements");
  }

  const admin = createAdminClient();
  await assertRateLimit(admin, user.id);

  const { data: creditRows, error: creditError } = await admin.rpc("consume_analysis_credit", { p_user: user.id });
  if (creditError) throw creditError;
  const credit = (creditRows as CreditRow[])[0];
  if (!credit?.allowed) throw new HttpError("payment_required");
  const features = planFeaturesSchema.parse(credit.features ?? {});

  let analysisId: string | null = null;
  try {
    const output = await analyze({
      cv: version.cv,
      requirements,
      jobText: job.raw_text,
      language: body.language,
      maxSuggestions: credit.tier === "free" ? features.max_suggestions : null,
    });

    const { data: analysis, error } = await admin
      .from("analyses")
      .insert({
        user_id: user.id,
        resume_id: version.resumeId,
        resume_version_id: version.id,
        job_id: job.id,
        language: body.language,
        score: output.score.score,
        score_breakdown: output.score,
        requirements,
        results: output.results,
        // "heuristic_fallback" = the configured AI failed and the rule-based engine wrote the suggestions.
        provider: output.fallback ? "heuristic_fallback" : (output.usage[0]?.provider ?? getProvider().name),
        tier: credit.tier,
        features,
        credit_source: credit.source,
        dropped_suggestions: output.droppedSuggestions,
      })
      .select("id")
      .single();
    if (error) throw error;
    analysisId = analysis.id;

    if (output.suggestions.length) {
      const { error: sErr } = await admin.from("suggestions").insert(
        output.suggestions.map((s, position) => ({
          analysis_id: analysis.id,
          user_id: user.id,
          position,
          kind: s.kind,
          section: s.section,
          target_ref: s.targetRef,
          original_text: s.original,
          suggested_text: s.suggested,
          rationale: s.rationale,
          requires_confirmation: s.requiresConfirmation,
          flags: s.flags,
        })),
      );
      if (sErr) throw sErr;
    }

    const usage = output.usage[0];
    if (credit.usage_event_id) {
      // Linking the usage row is what tells the daily reconciliation job that this credit was used.
      const { error: uErr } = await admin
        .from("usage_events")
        .update({ analysis_id: analysis.id, provider: usage?.provider ?? null, model: usage?.model ?? null, input_tokens: usage?.inputTokens ?? 0, output_tokens: usage?.outputTokens ?? 0 })
        .eq("id", credit.usage_event_id);
      if (uErr) throw uErr;
    }
    log.info("analysis.created", { userId: user.id, analysisId: analysis.id, tier: credit.tier, score: output.score.score });
    analytics.feature(user.id, "analise_executada");
    analytics.step(user.id, "primeira_analise");
    analytics.onboardingCompleted(user.id);
    return NextResponse.json({ analysisId: analysis.id });
  } catch (err) {
    // Never charge for a failed analysis, and never keep a half-written one the user did not pay for.
    if (analysisId) await admin.from("analyses").delete().eq("id", analysisId).eq("user_id", user.id);
    await admin.rpc("refund_analysis_credit", { p_user: user.id, p_usage_event_id: credit.usage_event_id, p_ledger_id: credit.ledger_id });
    throw err;
  }
});
