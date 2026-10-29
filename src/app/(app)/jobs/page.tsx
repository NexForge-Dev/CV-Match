import Link from "next/link";
import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
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
        <ul className="space-y-3">
          {data.map((j) => {
            const analyses = (j.analyses as { id: string }[] | null) ?? [];
            return (
              <li key={j.id} className="card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{j.title || "—"}</p>
                    <p className="text-sm text-ink-muted">{[j.company, j.location, formatDate(j.created_at, locale)].filter(Boolean).join(" · ")}</p>
                    <p className="mt-1 text-xs text-ink-soft">{t.jobs.requirements((j.requirements as unknown[]).length)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {j.url && (
                      <a href={j.url} target="_blank" rel="noopener noreferrer nofollow" className="btn-secondary btn-sm">
                        <ExternalLink className="h-3.5 w-3.5" /> {t.jobs.viewAd}
                      </a>
                    )}
                    <DeleteButton url={`/api/jobs/${j.id}`} />
                  </div>
                </div>
                {analyses.length > 0 && (
                  <p className="mt-2 text-xs">
                    {t.jobs.analyses}:{" "}
                    {analyses.map((a, i) => (
                      <Link key={a.id} href={`/analyses/${a.id}`} className="link mr-2">#{i + 1}</Link>
                    ))}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState title={t.dashboard.noJobs} />
      )}
    </div>
  );
}
