import { NextResponse } from "next/server";
import { z } from "zod";
import { HttpError, assertUuid, parseJson, withUser } from "@/lib/api";
import { requirementSchema } from "@/lib/analysis/requirements";
import { matchResultSchema } from "@/lib/analysis/match";
import { coverLetter, interviewPrep } from "@/lib/ai/pipeline";
import { planFeaturesSchema } from "@/lib/billing/plans";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadVersion } from "@/lib/server/resumes";
import { completeUsage, reserveUsage } from "@/lib/server/usage";
import { analytics } from "@/lib/analytics";

export const runtime = "nodejs";
export const maxDuration = 120;

type Ctx = { params: Promise<{ id: string }> };
const schema = z.object({ kind: z.enum(["cover_letter", "interview_prep"]) });

/** Cover letter / interview prep. Access is decided by the features stored on the analysis at creation time. */
export const POST = withUser<Ctx>(async (req, { params }, { user, supabase }) => {
  const { id } = await params;
  assertUuid(id);
  const { kind } = await parseJson(req, schema);

  const { data: analysis } = await supabase
    .from("analyses")
    .select("id, resume_version_id, language, requirements, results, features, job_descriptions(title, company)")
    .eq("id", id)
    .maybeSingle();
  if (!analysis) throw new HttpError("not_found");
  const features = planFeaturesSchema.parse(analysis.features ?? {});
  if (!features[kind]) throw new HttpError("feature_locked");

  const admin = createAdminClient();
  const usageId = await reserveUsage(admin, user.id, kind, id);

  const version = await loadVersion(supabase, analysis.resume_version_id);
  const job = (Array.isArray(analysis.job_descriptions) ? analysis.job_descriptions[0] : analysis.job_descriptions) as { title: string; company: string } | null;
  const input = {
    cv: version.cv,
    requirements: z.array(requirementSchema).parse(analysis.requirements),
    results: z.array(matchResultSchema).parse(analysis.results),
    language: analysis.language as "pt" | "es" | "en",
    job: { title: job?.title ?? "", company: job?.company ?? "" },
  };

  const result = kind === "cover_letter" ? await coverLetter(input) : await interviewPrep(input);
  // engine/fallback let the UI say honestly which engine produced the text.
  const meta = { engine: result.usage.provider, fallback: result.fallback };
  const content = kind === "cover_letter" ? { text: result.value, ...meta } : { items: result.value, ...meta };
  await completeUsage(admin, usageId, result.usage);

  const { error } = await admin.from("analysis_extras").upsert({ analysis_id: id, user_id: user.id, kind, content, created_at: new Date().toISOString() }, { onConflict: "analysis_id,kind" });
  if (error) throw error;
  analytics.feature(user.id, kind === "cover_letter" ? "carta_apresentacao" : "preparacao_entrevista");
  return NextResponse.json({ kind, content });
});
