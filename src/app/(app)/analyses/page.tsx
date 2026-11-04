import Link from "next/link";
import type { Metadata } from "next";
import { FileSearch, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n/server";
import { formatDate } from "@/lib/i18n/config";
import { EmptyState, PageHeader, ScoreRing } from "@/components/ui";
import { DeleteButton } from "@/components/DeleteButton";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t.nav.analyses };
}

type Rel<T> = T | T[] | null;
const one = <T,>(v: Rel<T>): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

export default async function AnalysesPage() {
  const { supabase } = await requireUser("/analyses");
  const { t, locale } = await getDictionary();
  const { data } = await supabase
    .from("analyses")
    .select("id, score, created_at, tier, job_descriptions(title, company), resumes(title), resume_versions!analyses_resume_version_id_fkey(version_number)")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title={t.nav.analyses} actions={<Link href="/new" className="btn-primary"><Plus aria-hidden className="h-4 w-4" /> {t.nav.newAnalysis}</Link>} />
      {data?.length ? (
        <ul className="card divider-list">
          {data.map((a) => {
            const job = one(a.job_descriptions as Rel<{ title: string; company: string }>);
            const resume = one(a.resumes as Rel<{ title: string }>);
            const version = one(a.resume_versions as Rel<{ version_number: number }>);
            return (
              <li key={a.id} className="flex items-center gap-3 p-3 transition-colors hover:bg-slate-50 sm:gap-4 sm:px-5">
                <Link href={`/analyses/${a.id}`} className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
                  <ScoreRing score={a.score} size={48} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-ink">{job?.title || "—"}{job?.company ? ` · ${job.company}` : ""}</span>
                    <span className="block truncate text-xs text-ink-muted">
                      {resume?.title}{version ? ` · v${version.version_number}` : ""} · {formatDate(a.created_at, locale)}
                    </span>
                  </span>
                </Link>
                <DeleteButton url={`/api/analyses/${a.id}`} />
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState icon={FileSearch} title={t.dashboard.noAnalyses} action={<Link href="/new" className="btn-primary btn-sm">{t.dashboard.start}</Link>} />
      )}
    </div>
  );
}
