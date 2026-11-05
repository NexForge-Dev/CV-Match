import Link from "next/link";
import type { Metadata } from "next";
import { Briefcase, ExternalLink } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n/server";
import { formatDate } from "@/lib/i18n/config";
import { EmptyState, PageHeader } from "@/components/ui";
import { DeleteButton } from "@/components/DeleteButton";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t.nav.jobs };
}

export default async function JobsPage() {
  const { supabase } = await requireUser("/jobs");
  const { t, locale } = await getDictionary();
  const { data } = await supabase
    .from("job_descriptions")
    .select("id, title, company, location, url, requirements, created_at, analyses(id)")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title={t.jobs.title} subtitle={t.jobs.subtitle} />
      {data?.length ? (
        <ul className="card divider-list">
          {data.map((j) => {
            const analyses = (j.analyses as { id: string }[] | null) ?? [];
            return (
              <li key={j.id} className="p-4 sm:px-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="break-words font-semibold text-ink">{j.title || "—"}</p>
                    <p className="break-words text-sm text-ink-muted">{[j.company, j.location, formatDate(j.created_at, locale)].filter(Boolean).join(" · ")}</p>
                    <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="tag">{t.jobs.requirements((j.requirements as unknown[]).length)}</span>
                      {analyses.length > 0 && <span className="ml-1 text-ink-muted">{t.jobs.analyses}:</span>}
                      {analyses.map((a, i) => (
                        <Link key={a.id} href={`/analyses/${a.id}`} className="link-solo readout min-w-11">#{i + 1}</Link>
                      ))}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {j.url && (
                      <a href={j.url} target="_blank" rel="noopener noreferrer nofollow" className="btn-secondary btn-sm">
                        <ExternalLink aria-hidden className="h-3.5 w-3.5" /> {t.jobs.viewAd}
                      </a>
                    )}
                    <DeleteButton url={`/api/jobs/${j.id}`} />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState icon={Briefcase} title={t.dashboard.noJobs} text={t.jobs.subtitle} action={<Link href="/new" className="btn-primary btn-sm">{t.dashboard.start}</Link>} />
      )}
    </div>
  );
}
