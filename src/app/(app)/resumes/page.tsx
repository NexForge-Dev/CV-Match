import Link from "next/link";
import type { Metadata } from "next";
import { FileText, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n/server";
import { formatDate } from "@/lib/i18n/config";
import { EmptyState, PageHeader } from "@/components/ui";
import { must } from "@/lib/server/must";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t.nav.resumes };
}

export default async function ResumesPage() {
  const { supabase } = await requireUser("/resumes");
  const { t, locale } = await getDictionary();
  const { data: resumes } = must(await supabase
    .from("resumes")
    .select("id, title, language, template, updated_at, resume_versions(count), analyses(count)")
    .order("updated_at", { ascending: false }));

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title={t.resumes.title} subtitle={t.resumes.subtitle} actions={<Link href="/new" className="btn-primary"><Plus aria-hidden className="h-4 w-4" /> {t.nav.newAnalysis}</Link>} />
      {resumes?.length ? (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {resumes.map((r) => {
            const versions = (r.resume_versions as { count: number }[] | null)?.[0]?.count ?? 0;
            const analyses = (r.analyses as { count: number }[] | null)?.[0]?.count ?? 0;
            return (
              <li key={r.id}>
                <Link href={`/resumes/${r.id}`} className="card-interactive block p-5">
                  <div className="flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
                      <FileText aria-hidden className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink">{r.title}</p>
                      <p className="mt-0.5 text-xs text-ink-muted">
                        {t.cvLanguage[r.language as "pt" | "es" | "en"]} · {t.templates[r.template as "classic" | "modern"]} · {formatDate(r.updated_at, locale)}
                      </p>
                      <p className="mt-3 flex flex-wrap gap-1.5">
                        <span className="tag">{t.resumes.versions}: {versions}</span>
                        <span className="tag">{t.nav.analyses}: {analyses}</span>
                      </p>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState icon={FileText} title={t.dashboard.noCvs} action={<Link href="/new" className="btn-primary btn-sm">{t.dashboard.start}</Link>} />
      )}
    </div>
  );
}
