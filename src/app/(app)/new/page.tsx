import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { aiProvider, env } from "@/lib/env";
import { getDictionary } from "@/lib/i18n/server";
import { analysesAvailable, getCreditSummary } from "@/lib/server/credits";
import { PageHeader } from "@/components/ui";
import { NewAnalysisWizard, type ExistingResume, type SavedJob } from "@/components/app/NewAnalysisWizard";
import { must } from "@/lib/server/must";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t.nav.newAnalysis };
}

export default async function NewAnalysisPage({ searchParams }: { searchParams: Promise<{ resume?: string }> }) {
  const { supabase } = await requireUser("/new");
  const { t } = await getDictionary();
  const { resume: preselect } = await searchParams;

  const [profile, resumes, jobs, credits] = await Promise.all([
    supabase.from("profiles").select("full_name, cv_language, cv_template").maybeSingle(),
    supabase.from("resumes").select("id, title, language, resume_versions(id, version_number)").order("updated_at", { ascending: false }).limit(20),
    supabase.from("job_descriptions").select("id, title, company, language").eq("saved", true).order("created_at", { ascending: false }).limit(20),
    getCreditSummary(supabase),
  ]);
  [profile, resumes, jobs].forEach(must);

  const existing: ExistingResume[] = (resumes.data ?? [])
    .map((r) => {
      const versions = (r.resume_versions as { id: string; version_number: number }[] | null) ?? [];
      const latest = [...versions].sort((a, b) => b.version_number - a.version_number)[0];
      return latest ? { id: r.id, title: r.title, language: r.language, versionId: latest.id, versionNumber: latest.version_number } : null;
    })
    .filter((r): r is ExistingResume => r !== null);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title={t.wizard.title} />
      <NewAnalysisWizard
        existing={existing}
        savedJobs={(jobs.data ?? []) as SavedJob[]}
        defaultLanguage={(profile.data?.cv_language as "pt" | "es" | "en") ?? "pt"}
        maxUploadMb={Math.round(env().UPLOAD_MAX_BYTES / 1024 / 1024)}
        maxUploadBytes={env().UPLOAD_MAX_BYTES}
        available={analysesAvailable(credits)}
        preselectResumeId={preselect ?? null}
        aiEnabled={aiProvider() === "anthropic"}
      />
    </div>
  );
}
