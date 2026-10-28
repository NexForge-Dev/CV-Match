import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Briefcase, FileSearch, FileText, ListChecks, PlusCircle } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n/server";
import { formatDate } from "@/lib/i18n/config";
import { analysesAvailable, getCreditSummary, hasActiveSubscription } from "@/lib/server/credits";
import { EmptyState, PageHeader, ScoreRing } from "@/components/ui";

export const metadata: Metadata = { title: "Dashboard" };

type Rel<T> = T | T[] | null;
const one = <T,>(v: Rel<T>): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

export default async function DashboardPage() {
  const { supabase } = await requireUser("/dashboard");
  const { t, locale } = await getDictionary();

  const [profile, resumes, analyses, jobs, pending, credits] = await Promise.all([
    supabase.from("profiles").select("full_name").maybeSingle(),
    supabase.from("resumes").select("id, title, language, updated_at").order("updated_at", { ascending: false }).limit(5),
    supabase.from("analyses").select("id, score, created_at, job_descriptions(title, company), resumes(title)").order("created_at", { ascending: false }).limit(5),
    supabase.from("job_descriptions").select("id, title, company, created_at").eq("saved", true).order("created_at", { ascending: false }).limit(5),
    supabase.from("suggestions").select("analysis_id", { count: "exact" }).eq("status", "pending").neq("kind", "gap_answer").limit(1),
    getCreditSummary(supabase),
  ]);

  const firstName = (profile.data?.full_name ?? "").split(" ")[0];
  const pendingCount = pending.count ?? 0;
  const pendingAnalysis = pending.data?.[0]?.analysis_id as string | undefined;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={t.dashboard.hello(firstName)}
        subtitle={t.dashboard.subtitle}
        actions={
          <Link href="/new" className="btn-primary">
            <PlusCircle className="h-4 w-4" /> {t.dashboard.start}
          </Link>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="card p-5">
          <p className="text-sm font-medium text-ink-muted">{t.dashboard.credits}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-sm">
            {hasActiveSubscription(credits) && <span className="badge bg-brand-50 text-brand-700">{t.dashboard.subLeft(credits.period_used ?? 0, credits.period_included ?? 0)}</span>}
            <span className="badge bg-slate-100 text-ink-soft">{t.dashboard.paidLeft(credits.paid_credits)}</span>
            <span className="badge bg-slate-100 text-ink-soft">{t.dashboard.freeLeft(credits.free_credits)}</span>
          </div>
          {analysesAvailable(credits) === 0 ? (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <p className="text-sm font-medium text-amber-800">{t.dashboard.noCredits}</p>
              <Link href="/billing" className="btn-primary btn-sm">{t.dashboard.buy}</Link>
            </div>
          ) : (
            <Link href="/billing" className="link mt-3 inline-block text-sm">{t.nav.billing} →</Link>
          )}
        </div>
        <div className="card p-5">
          <p className="flex items-center gap-2 text-sm font-medium text-ink-muted"><ListChecks className="h-4 w-4" /> {t.dashboard.pending}</p>
          <p className="mt-2 text-2xl font-bold">{pendingCount}</p>
          <p className="text-sm text-ink-muted">{t.dashboard.pendingText(pendingCount)}</p>
          {pendingAnalysis && <Link href={`/analyses/${pendingAnalysis}?tab=suggestions`} className="link mt-2 inline-block text-sm">{t.common.open} →</Link>}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold"><FileSearch className="h-4 w-4 text-brand-600" /> {t.dashboard.recentAnalyses}</h2>
            <Link href="/analyses" className="link text-sm">{t.dashboard.viewAll}</Link>
          </div>
          {analyses.data?.length ? (
            <ul className="divide-y divide-slate-100">
              {analyses.data.map((a) => {
                const job = one(a.job_descriptions as Rel<{ title: string; company: string }>);
                const resume = one(a.resumes as Rel<{ title: string }>);
                return (
                  <li key={a.id}>
                    <Link href={`/analyses/${a.id}`} className="flex items-center gap-4 py-3 hover:bg-slate-50">
                      <ScoreRing score={a.score} size={44} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{job?.title || job?.company || "—"}{job?.company && job?.title ? ` · ${job.company}` : ""}</p>
                        <p className="truncate text-xs text-ink-muted">{resume?.title} · {formatDate(a.created_at, locale)}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-ink-muted" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState title={t.dashboard.noAnalyses} action={<Link href="/new" className="btn-primary btn-sm">{t.dashboard.start}</Link>} />
          )}
        </section>

        <div className="space-y-6">
          <section className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-semibold"><FileText className="h-4 w-4 text-brand-600" /> {t.dashboard.recentCvs}</h2>
              <Link href="/resumes" className="link text-sm">{t.dashboard.viewAll}</Link>
            </div>
            {resumes.data?.length ? (
              <ul className="space-y-2 text-sm">
                {resumes.data.map((r) => (
                  <li key={r.id}>
                    <Link href={`/resumes/${r.id}`} className="flex justify-between gap-2 hover:text-brand-700">
                      <span className="truncate">{r.title}</span>
                      <span className="shrink-0 text-xs uppercase text-ink-muted">{r.language}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-muted">{t.dashboard.noCvs}</p>
            )}
          </section>
          <section className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-semibold"><Briefcase className="h-4 w-4 text-brand-600" /> {t.dashboard.savedJobs}</h2>
              <Link href="/jobs" className="link text-sm">{t.dashboard.viewAll}</Link>
            </div>
            {jobs.data?.length ? (
              <ul className="space-y-2 text-sm">
                {jobs.data.map((j) => (
                  <li key={j.id} className="truncate">
                    {j.title || "—"}
                    {j.company ? <span className="text-ink-muted"> · {j.company}</span> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-muted">{t.dashboard.noJobs}</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
