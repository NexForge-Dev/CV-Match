import Link from "next/link";
import { ArrowRight, Check, Download, FileText, ListChecks, PenLine, Search, ShieldCheck, Sparkles } from "lucide-react";
import { DemoFlow } from "@/components/marketing/DemoFlow";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { StatusBadge } from "@/components/marketing/StatusBadge";
import { getPublicPlans } from "@/lib/billing/getPlans";
import type { Plan } from "@/lib/billing/plans";
import { formatPrice, type Locale } from "@/lib/i18n/config";
import { marketing, type MarketingDict } from "@/lib/i18n/marketing";
import { getLocale } from "@/lib/i18n/server";

const STEP_ICONS = [FileText, Search, ListChecks, PenLine, Download];

function PlanCard({ plan, t, locale }: { plan: Plan; t: MarketingDict; locale: Locale }) {
  const p = t.pricing;
  const highlighted = plan.billing_interval === "quarter";
  const features: string[] = [
    plan.kind === "subscription" ? (plan.billing_interval === "quarter" ? p.analysesPerQuarter : p.analysesPerMonth)(plan.analyses_included) : p.analyses(plan.analyses_included),
    plan.features.max_suggestions ? p.suggestionsLimited(plan.features.max_suggestions) : p.suggestionsFull,
  ];
  if (plan.features.cover_letter) features.push(p.coverLetter);
  if (plan.features.interview_prep) features.push(p.interview);
  if (plan.features.export_pdf || plan.features.export_docx) features.push(p.export);

  return (
    <div className={`card relative flex flex-col p-6 ${highlighted ? "ring-2 ring-brand-500" : ""}`}>
      {highlighted && <span className="badge absolute -top-3 left-6 bg-brand-600 text-white">{p.popular}</span>}
      <h3 className="text-lg font-semibold text-ink">{plan.name}</h3>
      <p className="mt-3 flex items-baseline gap-1">
        <span className="text-3xl font-bold tracking-tight text-ink">{formatPrice(plan.price_cents, plan.currency, locale)}</span>
        <span className="text-sm text-ink-muted">{plan.kind === "subscription" ? (plan.billing_interval === "quarter" ? p.perQuarter : p.perMonth) : plan.kind === "pack" ? p.oneTime : ""}</span>
      </p>
      <ul className="mt-5 flex-1 space-y-2 text-sm text-ink-soft">
        {features.map((f) => (
          <li key={f} className="flex gap-2">
            <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
            {f}
          </li>
        ))}
      </ul>
      <Link href={`/signup?plan=${encodeURIComponent(plan.id)}`} className={`mt-6 ${highlighted ? "btn-primary" : "btn-secondary"}`}>
        {p.cta[plan.kind]}
      </Link>
    </div>
  );
}

export default async function LandingPage() {
  const locale = await getLocale();
  const t = marketing[locale];
  const plans = await getPublicPlans();

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <MarketingHeader t={t} />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-white to-white">
          <div className="mx-auto max-w-6xl px-4 pb-16 pt-14 sm:pt-20">
            <div className="mx-auto max-w-3xl text-center">
              <p className="badge mx-auto bg-white text-brand-700 ring-1 ring-brand-200">
                <Sparkles aria-hidden className="h-3.5 w-3.5" />
                {t.hero.eyebrow}
              </p>
              <h1 className="mt-5 text-4xl font-bold tracking-tight text-ink sm:text-5xl">{t.hero.title}</h1>
              <p className="mt-5 text-base leading-relaxed text-ink-soft sm:text-lg">{t.hero.subtitle}</p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link href="/signup?next=/new" className="btn-primary px-6 py-3 text-base">
                  {t.hero.primary}
                  <ArrowRight aria-hidden className="h-4 w-4" />
                </Link>
                <Link href="#how" className="btn-secondary px-6 py-3 text-base">
                  {t.hero.secondary}
                </Link>
              </div>
              <p className="mt-3 text-xs text-ink-muted">{t.hero.note}</p>
            </div>
          </div>
        </section>

        {/* Demo */}
        <section id="demo" className="mx-auto max-w-6xl px-4 py-14">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">{t.demo.title}</h2>
            <p className="mt-2 text-ink-muted">{t.demo.subtitle}</p>
          </div>
          <DemoFlow t={t} />
        </section>

        {/* Before / after */}
        <section className="bg-slate-50 py-14">
          <div className="mx-auto max-w-6xl px-4">
            <div className="mb-8 max-w-2xl">
              <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">{t.beforeAfter.title}</h2>
              <p className="mt-2 text-ink-muted">{t.beforeAfter.subtitle}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {t.beforeAfter.examples.map((ex) => (
                <div key={ex.tag} className="card p-5">
                  <p className="badge bg-brand-50 text-brand-700">{ex.tag}</p>
                  <div className="mt-4 space-y-3 text-sm">
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{t.beforeAfter.before}</p>
                      <p className="mt-1 text-ink-soft line-through decoration-slate-300">{ex.before}</p>
                    </div>
                    <div className="rounded-lg bg-emerald-50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{t.beforeAfter.after}</p>
                      <p className="mt-1 text-ink">{ex.after}</p>
                    </div>
                  </div>
                </div>
              ))}
              <div className="card p-5 md:col-span-2">
                <StatusBadge status="not_found" label={t.beforeAfter.confirmTag} />
                <p className="mt-3 text-sm text-ink-soft">{t.beforeAfter.confirmText}</p>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-14">
          <h2 className="text-center text-2xl font-bold tracking-tight text-ink sm:text-3xl">{t.how.title}</h2>
          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {t.how.steps.map((step, i) => {
              const Icon = STEP_ICONS[i] ?? FileText;
              return (
                <li key={step.title} className="card p-5">
                  <div className="flex items-center gap-2">
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-600 text-sm font-bold text-white">{i + 1}</span>
                    <Icon aria-hidden className="h-5 w-5 text-brand-600" />
                  </div>
                  <h3 className="mt-3 font-semibold text-ink">{step.title}</h3>
                  <p className="mt-1 text-sm text-ink-muted">{step.text}</p>
                </li>
              );
            })}
          </ol>
        </section>

        {/* Pricing */}
        <section id="pricing" className="scroll-mt-20 bg-slate-50 py-14">
          <div className="mx-auto max-w-6xl px-4">
            <div className="mb-10 text-center">
              <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">{t.pricing.title}</h2>
              <p className="mt-2 text-ink-muted">{t.pricing.subtitle}</p>
            </div>
            <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2 lg:grid-cols-4">
              {plans.map((plan) => (
                <PlanCard key={plan.id} plan={plan} t={t} locale={locale} />
              ))}
            </div>
            <p className="mt-6 text-center text-xs text-ink-muted">{t.pricing.disclaimer}</p>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-14">
          <h2 className="text-center text-2xl font-bold tracking-tight text-ink sm:text-3xl">{t.faq.title}</h2>
          <div className="mt-8 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
            {t.faq.items.map((item) => (
              <details key={item.q} className="group px-5 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-ink">
                  {item.q}
                  <span aria-hidden className="text-brand-600 transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-4 pb-16">
          <div className="mx-auto max-w-4xl rounded-2xl bg-brand-700 px-6 py-12 text-center text-white">
            <ShieldCheck aria-hidden className="mx-auto h-8 w-8 text-brand-200" />
            <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">{t.finalCta.title}</h2>
            <p className="mx-auto mt-2 max-w-xl text-brand-100">{t.finalCta.text}</p>
            <Link href="/signup?next=/new" className="btn mt-6 bg-white px-6 py-3 text-base text-brand-700 hover:bg-brand-50">
              {t.finalCta.button}
              <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <MarketingFooter t={t} />
    </div>
  );
}
