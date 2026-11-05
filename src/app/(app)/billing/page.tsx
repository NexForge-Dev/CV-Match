import type { Metadata } from "next";
import { Check } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n/server";
import { formatDate, formatPrice } from "@/lib/i18n/config";
import { getPublicPlans } from "@/lib/billing/getPlans";
import { env } from "@/lib/env";
import { getCreditSummary, hasActiveSubscription } from "@/lib/server/credits";
import { Alert, CardHeader, PageHeader, StatCard } from "@/components/ui";
import { CheckoutButton, PortalButton, TermsConsentCheckbox, TermsConsentProvider } from "@/components/app/BillingButtons";
import { track } from "@/lib/analytics";
import { must } from "@/lib/server/must";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return { title: t.nav.billing };
}

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { user, supabase } = await requireUser("/billing");
  track("plan_viewed", user.id);
  const { t, locale } = await getDictionary();
  const b = t.billing;
  const { status } = await searchParams;
  const [plans, credits, ledger, customer, subscription] = await Promise.all([
    getPublicPlans(),
    getCreditSummary(supabase),
    supabase.from("credit_ledger").select("id, delta, credit_type, reason, created_at").order("created_at", { ascending: false }).limit(20),
    supabase.from("billing_customers").select("stripe_customer_id").maybeSingle(),
    supabase.from("subscriptions").select("status, cancel_at_period_end").maybeSingle(),
  ]);
  [ledger, customer, subscription].forEach(must);
  const subscribed = hasActiveSubscription(credits);
  const paymentIssue = ["past_due", "unpaid", "incomplete"].includes(subscription.data?.status ?? "");
  const stripeKey = env().STRIPE_SECRET_KEY ?? "";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader title={b.title} subtitle={b.subtitle} />
      {status === "success" && <Alert tone="success">{b.success}</Alert>}
      {status === "canceled" && <Alert tone="warn">{b.canceled}</Alert>}
      {stripeKey.startsWith("sk_test_") && <Alert tone="info">{b.testMode}</Alert>}
      {!stripeKey && <Alert tone="warn">{t.errors.not_configured} (Stripe)</Alert>}
      {paymentIssue && <Alert tone="warn">{b.paymentIssue}</Alert>}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3" aria-label={b.current}>
        <StatCard label={b.free} value={credits.free_credits} />
        <StatCard label={b.paid} value={credits.paid_credits} />
        <StatCard
          label={b.pro}
          value={subscribed ? `${Math.max((credits.period_included ?? 0) - (credits.period_used ?? 0), 0)}/${credits.period_included}` : "—"}
          hint={
            subscribed && (credits.period_end || subscription.data?.cancel_at_period_end) ? (
              <>
                {credits.period_end && <p className="text-xs">{b.periodEnds(formatDate(credits.period_end, locale))}</p>}
                {subscription.data?.cancel_at_period_end && <p className="text-xs font-medium text-partial-ink">{b.cancelAtEnd}</p>}
              </>
            ) : undefined
          }
        >
          {customer.data && subscription.data && <PortalButton />}
        </StatCard>
      </section>

      <TermsConsentProvider>
        <h2 className="pt-2 text-lg font-semibold text-ink">{b.plansTitle}</h2>
        <TermsConsentCheckbox />
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan) => {
            const f = plan.features;
            const features = [
              plan.kind === "free" ? b.oneAnalysis : plan.kind === "subscription" ? (plan.billing_interval === "quarter" ? b.analysesQuarter : b.analysesMonth)(plan.analyses_included) : b.analyses(plan.analyses_included),
              f.max_suggestions ? b.limitedSuggestions(f.max_suggestions) : b.unlimitedSuggestions,
              ...(f.cover_letter ? [b.coverLetter] : []),
              ...(f.interview_prep ? [b.interviewPrep] : []),
              b.exports,
            ];
            return (
              <div key={plan.id} className={`card flex flex-col p-5 ${plan.kind === "subscription" ? "border-brand-300" : ""}`}>
                <h3 className="font-semibold text-ink">{plan.name}</h3>
                <p className="mt-2 flex flex-wrap items-baseline gap-x-1">
                  <span className="text-3xl font-bold tracking-tight text-ink">{formatPrice(plan.price_cents, plan.currency, locale)}</span>
                  {plan.kind === "subscription" && <span className="text-sm text-ink-muted">{plan.billing_interval === "quarter" ? b.perQuarter : b.perMonth}</span>}
                </p>
                <ul className="mt-4 flex-1 space-y-2 text-sm text-ink-soft">
                  {features.map((x) => (
                    <li key={x} className="flex gap-2"><Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" /> {x}</li>
                  ))}
                </ul>
                {plan.kind !== "free" && (
                  <div className="mt-6">
                    <CheckoutButton planId={plan.id} label={plan.kind === "subscription" ? b.subscribe : b.buy} disabled={!stripeKey || (plan.kind === "subscription" && subscribed)} />
                  </div>
                )}
              </div>
            );
          })}
        </section>
      </TermsConsentProvider>

      {ledger.data && ledger.data.length > 0 && (
        <section className="card">
          <CardHeader title={b.history} />
          <ul className="divider-list text-sm">
            {ledger.data.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 px-5 py-2.5">
                <span className="min-w-0 text-ink">{b.reasons[l.reason] ?? l.reason} <span className="text-xs text-ink-muted">· {formatDate(l.created_at, locale)}</span></span>
                <span className={`readout shrink-0 font-medium ${l.delta > 0 ? "text-found-ink" : "text-ink-soft"}`}>{l.delta > 0 ? `+${l.delta}` : l.delta}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
