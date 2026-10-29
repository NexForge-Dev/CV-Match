import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getDictionary } from "@/lib/i18n/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { uuidLike } from "@/lib/api";
import { requirementSchema } from "@/lib/analysis/requirements";
import { matchResultSchema, type ScoreBreakdown } from "@/lib/analysis/match";
import { planFeaturesSchema } from "@/lib/billing/plans";
import { AnalysisView, type SuggestionRow } from "@/components/app/AnalysisView";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t.nav.analyses };
}

type Rel<T> = T | T[] | null;
const one = <T,>(v: Rel<T>): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

export default async function AnalysisPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { id } = await params;
  const { tab } = await searchParams;
  if (!uuidLike.test(id)) notFound();
  const { supabase } = await requireUser(`/analyses/${id}`);

  const { data: analysis } = await supabase
    .from("analyses")
    .select("id, created_at, language, score, score_breakdown, requirements, results, provider, tier, features, dropped_suggestions, resume_id, resume_version_id, job_descriptions(id, title, company, location, url), resume_versions!analyses_resume_version_id_fkey(version_number), resumes(title)")
    .eq("id", id)
    .maybeSingle();
  if (!analysis) notFound();

  const [{ data: suggestions }, { data: extras }] = await Promise.all([
    supabase
      .from("suggestions")
      .select("id, kind, section, target_ref, original_text, suggested_text, edited_text, rationale, status, requires_confirmation, confirmed_by_user, flags")
      .eq("analysis_id", id)
      .order("position"),
    supabase.from("analysis_extras").select("kind, content").eq("analysis_id", id),
  ]);

  const job = one(analysis.job_descriptions as Rel<{ id: string; title: string; company: string; location: string; url: string }>);
  const version = one(analysis.resume_versions as Rel<{ version_number: number }>);
  const resume = one(analysis.resumes as Rel<{ title: string }>);
  const letter = extras?.find((e) => e.kind === "cover_letter")?.content as { text: string; fallback?: boolean } | undefined;
  const interview = extras?.find((e) => e.kind === "interview_prep")?.content as { items: { requirement: string; question: string; evidence: string[]; tip: string }[]; fallback?: boolean } | undefined;

  return (
    <AnalysisView
      initialTab={tab === "suggestions" ? "suggestions" : "requirements"}
      analysis={{
        id: analysis.id,
        createdAt: analysis.created_at,
        language: analysis.language,
        score: analysis.score,
        breakdown: analysis.score_breakdown as ScoreBreakdown,
        requirements: z.array(requirementSchema).parse(analysis.requirements),
        results: z.array(matchResultSchema).parse(analysis.results),
        provider: analysis.provider,
        tier: analysis.tier,
        features: planFeaturesSchema.parse(analysis.features ?? {}),
        dropped: analysis.dropped_suggestions,
        resumeId: analysis.resume_id,
        resumeTitle: resume?.title ?? "",
        versionNumber: version?.version_number ?? 0,
        job: job ?? { id: "", title: "", company: "", location: "", url: "" },
      }}
      suggestions={(suggestions ?? []) as SuggestionRow[]}
      letter={letter?.text ?? null}
      interview={interview?.items ?? null}
      extrasFallback={{ letter: letter?.fallback, interview: interview?.fallback }}
    />
  );
}
