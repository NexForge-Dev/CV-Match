import Link from "next/link";
import type { Metadata } from "next";
import { FileText, PlusCircle } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n/server";
import { formatDate } from "@/lib/i18n/config";
import { EmptyState, PageHeader } from "@/components/ui";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t.nav.resumes };
}

export default async function ResumesPage() {
  const { supabase } = await requireUser("/resumes");
  const { t, locale } = await getDictionary();
  const { data: resumes } = await supabase
    .from("resumes")
    .select("id, title, language, template, updated_at, resume_versions(count), analyses(count)")
    .order("updated_at", { ascending: false });

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title={t.resumes.title} subtitle={t.resumes.subtitle} actions={<Link href="/new" className="btn-primary"><PlusCircle className="h-4 w-4" /> {t.nav.newAnalysis}</Link>} />
      {resumes?.length ? (
        <ul className="grid gap-4 sm:grid-cols-2">
          {resumes.map((r) => {
            const versions = (r.resume_versions as { count: number }[] | null)?.[0]?.count ?? 0;
            const analyses = (r.analyses as { count: number }[] | null)?.[0]?.count ?? 0;
            return (
              <li key={r.id}>
                <Link href={`/resumes/${r.id}`} className="card block p-5 transition hover:border-brand-300">
                  <div className="flex items-start gap-3">
                    <FileText className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{r.title}</p>
                      <p className="mt-1 text-xs text-ink-muted">
                        {t.cvLanguage[r.language as "pt" | "es" | "en"]} · {t.templates[r.template as "classic" | "modern"]} · {formatDate(r.updated_at, locale)}
                      </p>
                      <p className="mt-2 text-xs text-ink-soft">{t.resumes.versions}: {versions} · {t.nav.analyses}: {analyses}</p>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState title={t.dashboard.noCvs} action={<Link href="/new" className="btn-primary btn-sm">{t.dashboard.start}</Link>} />
      )}
    </div>
  );
}
