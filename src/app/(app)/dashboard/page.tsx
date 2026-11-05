import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Briefcase, FileSearch, FileText, Gauge, ListChecks, Plus, Wallet } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n/server";
import { formatDate } from "@/lib/i18n/config";
import { analysesAvailable, getCreditSummary, hasActiveSubscription } from "@/lib/server/credits";
import { CardHeader, PageHeader, ScoreRing, StatCard } from "@/components/ui";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t.nav.dashboard };
}

type Rel<T> = T | T[] | null;
const one = <T,>(v: Rel<T>): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

export default async function DashboardPage() {
  const { supabase } = await requireUser("/dashboard");
  const { t, locale } = await getDictionary();
  const d = t.dashboard;

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
  const available = analysesAvailable(credits);
  const latest = analyses.data?.[0];
  const isNew = !analyses.data?.length;
  // A brand-new account sees the three steps instead of three empty lists.
  const blank = isNew && !resumes.data?.length && !jobs.data?.length;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={d.hello(firstName)}
        subtitle={d.subtitle}
        actions={
          <Link href="/new" className="btn-primary">
            <Plus aria-hidden className="h-4 w-4" /> {d.start}
          </Link>
        }
      />

      {isNew && (
        <section className="card mb-6 overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="font-semibold text-ink">{d.getStarted}</h2>
            <p className="mt-0.5 text-sm text-ink-muted">{d.getStartedText}</p>
          </div>
          <ol className="grid divide-y divide-slate-100 md:grid-cols-3 md:divide-x md:divide-y-0">
            {d.steps.map((step, i) => (
              <li key={step.title} className="flex gap-3 p-5">
                <span className="readout grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">{i + 1}</span>
                <div>
                  <p className="text-sm font-semibold text-ink">{step.title}</p>
                  <p className="mt-0.5 text-sm text-ink-muted">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="border-t border-slate-100 bg-slate-50 px-5 py-3">
            <Link href="/new" className="btn-primary btn-sm">
              {d.start} <ArrowRight aria-hidden className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          icon={Wallet}
          label={d.credits}
          value={available}
          hint={
            <span className="flex flex-wrap gap-x-2 gap-y-0.5">
              {hasActiveSubscription(credits) && <span>{d.subLeft(credits.period_used ?? 0, credits.period_included ?? 0)}</span>}
              {credits.paid_credits > 0 && <span>{d.paidLeft(credits.paid_credits)}</span>}
              {credits.free_credits > 0 && <span>{d.freeLeft(credits.free_credits)}</span>}
              {available === 0 && <span className="font-medium text-partial-ink">{d.noCredits}</span>}
            </span>
          }
        >
          {available === 0 ? (
            <Link href="/billing" className="btn-primary btn-sm">{d.buy}</Link>
          ) : (
            <Link href="/billing" className="link-solo text-sm">{t.nav.billing}</Link>
          )}
        </StatCard>
        <StatCard icon={ListChecks} label={d.pending} value={pendingCount} hint={pendingCount > 0 ? d.pendingText(pendingCount) : d.nothingPending}>
          {pendingAnalysis && <Link href={`/analyses/${pendingAnalysis}?tab=suggestions`} className="link-solo text-sm">{d.reviewPending}</Link>}
        </StatCard>
        <StatCard icon={Gauge} label={d.latestScore} value={latest?.score ?? "—"} hint={latest ? formatDate(latest.created_at, locale) : d.latestScoreEmpty}>
          {latest && <Link href={`/analyses/${latest.id}`} className="link-solo text-sm">{t.common.open}</Link>}
        </StatCard>
      </div>

      {/* grid-cols-1: without an explicit template the column grows to fit long (truncated) titles on phones. */}
      {!blank && <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="card min-w-0 lg:col-span-2">
          <CardHeader icon={FileSearch} title={d.recentAnalyses} action={<Link href="/analyses" className="link-solo">{d.viewAll}</Link>} />
          {analyses.data?.length ? (
            <ul className="divider-list">
              {analyses.data.map((a) => {
                const job = one(a.job_descriptions as Rel<{ title: string; company: string }>);
                const resume = one(a.resumes as Rel<{ title: string }>);
                return (
                  <li key={a.id}>
                    <Link href={`/analyses/${a.id}`} className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-slate-50">
                      <ScoreRing score={a.score} size={44} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">{job?.title || job?.company || "—"}{job?.company && job?.title ? ` · ${job.company}` : ""}</p>
                        <p className="truncate text-xs text-ink-muted">{resume?.title} · {formatDate(a.created_at, locale)}</p>
                      </div>
                      <ArrowRight aria-hidden className="h-4 w-4 shrink-0 text-slate-400" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="px-5 py-8 text-center text-sm text-ink-muted">{d.noAnalyses}</p>
          )}
        </section>

        <div className="min-w-0 space-y-6">
          <section className="card">
            <CardHeader icon={FileText} title={d.recentCvs} action={<Link href="/resumes" className="link-solo">{d.viewAll}</Link>} />
            {resumes.data?.length ? (
              <ul className="divider-list text-sm">
                {resumes.data.map((r) => (
                  <li key={r.id}>
                    <Link href={`/resumes/${r.id}`} className="flex items-center justify-between gap-2 px-5 py-2.5 transition-colors hover:bg-slate-50">
                      <span className="truncate text-ink">{r.title}</span>
                      <span className="tag shrink-0 uppercase">{r.language}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-6 text-sm text-ink-muted">{d.noCvs}</p>
            )}
          </section>
          <section className="card">
            <CardHeader icon={Briefcase} title={d.savedJobs} action={<Link href="/jobs" className="link-solo">{d.viewAll}</Link>} />
            {jobs.data?.length ? (
              <ul className="divider-list text-sm">
                {jobs.data.map((j) => (
                  <li key={j.id} className="truncate px-5 py-2.5 text-ink">
                    {j.title || "—"}
                    {j.company ? <span className="text-ink-muted"> · {j.company}</span> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-6 text-sm text-ink-muted">{d.noJobs}</p>
            )}
          </section>
        </div>
      </div>}
    </div>
  );
}
