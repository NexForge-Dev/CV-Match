import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, ChevronDown, Download, FileText, ListChecks, PenLine, Quote, Search, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { DemoFlow } from "@/components/marketing/DemoFlow";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { ResultPreview } from "@/components/marketing/ResultPreview";
import { StatusBadge } from "@/components/StatusBadge";
import { getPublicPlans } from "@/lib/billing/getPlans";
import type { Plan } from "@/lib/billing/plans";
import { formatPrice, type Locale } from "@/lib/i18n/config";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { marketing, type MarketingDict } from "@/lib/i18n/marketing";
import { getLocale } from "@/lib/i18n/server";

export const metadata: Metadata = { alternates: { canonical: "/" } };

const STEP_ICONS = [FileText, Search, ListChecks, PenLine, Download];
const PRINCIPLE_ICONS = [Quote, ShieldCheck, SlidersHorizontal];

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
    <div className={`card relative flex flex-col p-6 ${highlighted ? "border-brand-500 ring-1 ring-brand-500" : ""}`}>
      {highlighted && <span className="badge absolute -top-3 left-6 bg-brand-600 text-white">{p.popular}</span>}
      <h3 className="font-semibold text-ink">{plan.name}</h3>
      <p className="mt-3 flex flex-wrap items-baseline gap-x-1">
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
        {/* Hero: the proposition next to what the product actually returns. */}
        <section className="border-b border-line">
          <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-4 py-12 sm:py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-14 lg:py-20">
            <div>
              <p className="text-sm font-medium text-brand-700">{t.hero.eyebrow}</p>
              <h1 className="mt-4 text-4xl font-bold tracking-tight text-ink sm:text-5xl sm:leading-[1.08]">{t.hero.title}</h1>
              <p className="mt-5 text-base leading-relaxed text-ink-soft">{t.hero.subtitle}</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/signup?next=/new" className="btn-primary btn-lg px-5 sm:whitespace-nowrap">
                  {t.hero.primary}
                  <ArrowRight aria-hidden className="h-4 w-4" />
                </Link>
                <Link href="#how" className="btn-secondary btn-lg px-5 sm:whitespace-nowrap">
                  {t.hero.secondary}
                </Link>
              </div>
              <p className="mt-3 text-sm text-ink-muted">{t.hero.note}</p>
            </div>
            <DemoFlow t={t} />
          </div>
        </section>

        {/* Principles */}
        <section className="border-b border-line bg-slate-50">
          <ul className="mx-auto grid max-w-6xl grid-cols-1 divide-y divide-line px-4 md:grid-cols-3 md:divide-x md:divide-y-0">
            {t.principles.map((item, i) => {
              const Icon = PRINCIPLE_ICONS[i] ?? Quote;
              return (
                <li key={item.title} className="flex gap-3 py-5 md:px-6 md:py-7 md:first:pl-0 md:last:pr-0">
                  <Icon aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
                  <div>
                    <p className="font-semibold text-ink">{item.title}</p>
                    <p className="mt-0.5 text-sm text-ink-muted">{item.text}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {/* How it works */}
        <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-14 sm:py-20">
          <h2 className="section-title">{t.how.title}</h2>
          <ol className="mt-10 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-5">
            {t.how.steps.map((step, i) => {
              const Icon = STEP_ICONS[i] ?? FileText;
              return (
                <li key={step.title} className="border-t-2 border-brand-600 pt-4">
                  <div className="flex items-center justify-between">
                    <span className="readout text-sm font-semibold text-brand-700">{String(i + 1).padStart(2, "0")}</span>
                    <Icon aria-hidden className="h-5 w-5 text-ink-muted" />
                  </div>
                  <h3 className="mt-3 font-semibold text-ink">{step.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink-muted">{step.text}</p>
                </li>
              );
            })}
          </ol>
        </section>

        {/* The real result interface, with illustrative data */}
        <section id="result" className="scroll-mt-20 border-t border-line bg-slate-50 py-14 sm:py-20">
          <div className="mx-auto max-w-6xl px-4">
            <div className="max-w-2xl">
              <h2 className="section-title">{t.preview.title}</h2>
              <p className="mt-2 text-ink-muted">{t.preview.subtitle}</p>
            </div>
            <div className="mt-8">
              <ResultPreview t={t} a={dictionaries[locale].analysis} />
            </div>
          </div>
        </section>

        {/* Before / after */}
        <section className="border-y border-line py-14 sm:py-20">
          <div className="mx-auto max-w-6xl px-4">
            <div className="max-w-2xl">
              <h2 className="section-title">{t.beforeAfter.title}</h2>
              <p className="mt-2 text-ink-muted">{t.beforeAfter.subtitle}</p>
            </div>
            <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
              {t.beforeAfter.examples.map((ex) => (
                <div key={ex.tag} className="card p-5">
                  <p className="font-semibold text-ink">{ex.tag}</p>
                  <div className="mt-4 space-y-2 text-sm">
                    <div className="well">
                      <p className="eyebrow">{t.beforeAfter.before}</p>
                      <p className="mt-1 text-ink-muted line-through decoration-slate-300">{ex.before}</p>
                    </div>
                    <div className="rounded-lg bg-found-soft p-3">
                      <p className="eyebrow text-found-ink">{t.beforeAfter.after}</p>
                      <p className="mt-1 text-ink">{ex.after}</p>
                    </div>
                  </div>
                </div>
              ))}
              <div className="card flex flex-col items-start gap-3 p-5 md:col-span-2 md:flex-row md:items-center md:gap-4">
                <div className="shrink-0"><StatusBadge status="not_found" label={t.beforeAfter.confirmTag} /></div>
                <p className="text-sm text-ink-soft">{t.beforeAfter.confirmText}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-14 sm:py-20">
          <div className="max-w-2xl">
            <h2 className="section-title">{t.pricing.title}</h2>
            <p className="mt-2 text-ink-muted">{t.pricing.subtitle}</p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {plans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} t={t} locale={locale} />
            ))}
          </div>
          <p className="mt-6 text-xs text-ink-muted">{t.pricing.disclaimer}</p>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-20 border-t border-line bg-slate-50 py-14 sm:py-20">
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 lg:grid-cols-[1fr_2fr]">
            <h2 className="section-title">{t.faq.title}</h2>
            <div className="divide-y divide-line rounded-xl border border-line bg-white">
              {t.faq.items.map((item) => (
                <details key={item.q} className="group px-5 py-4">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 font-medium text-ink">
                    {item.q}
                    <ChevronDown aria-hidden className="h-4 w-4 shrink-0 text-ink-muted transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="bg-brand-800 py-14 text-white sm:py-16">
          <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{t.finalCta.title}</h2>
              <p className="mt-2 text-brand-100">{t.finalCta.text}</p>
            </div>
            <Link href="/signup?next=/new" className="btn btn-lg shrink-0 bg-white text-brand-800 hover:bg-brand-50">
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
