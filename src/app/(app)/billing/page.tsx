import type { Metadata } from "next";
import { Check } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n/server";
import { formatDate, formatPrice } from "@/lib/i18n/config";
import { getPublicPlans } from "@/lib/billing/getPlans";
import { env } from "@/lib/env";
import { getCreditSummary, hasActiveSubscription } from "@/lib/server/credits";
import { Alert, PageHeader } from "@/components/ui";
import { CheckoutButton, PortalButton, TermsConsentCheckbox, TermsConsentProvider } from "@/components/app/BillingButtons";
import { track } from "@/lib/analytics";

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

      <section className="card grid gap-4 p-6 sm:grid-cols-3">
        <div>
          <p className="text-sm text-ink-muted">{b.free}</p>
          <p className="text-2xl font-bold">{credits.free_credits}</p>
        </div>
        <div>
          <p className="text-sm text-ink-muted">{b.paid}</p>
          <p className="text-2xl font-bold">{credits.paid_credits}</p>
        </div>
        <div>
          <p className="text-sm text-ink-muted">{b.pro}</p>
          {subscribed ? (
            <>
              <p className="text-2xl font-bold">{Math.max((credits.period_included ?? 0) - (credits.period_used ?? 0), 0)} / {credits.period_included}</p>
              {credits.period_end && <p className="text-xs text-ink-muted">{b.periodEnds(formatDate(credits.period_end, locale))}</p>}
              {subscription.data?.cancel_at_period_end && <p className="text-xs font-medium text-amber-800">{b.cancelAtEnd}</p>}
            </>
          ) : (
            <p className="text-2xl font-bold">—</p>
          )}
          {customer.data && <div className="mt-2"><PortalButton /></div>}
        </div>
      </section>

      <TermsConsentProvider>
        <TermsConsentCheckbox />
        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
              <div key={plan.id} className={`card flex flex-col p-6 ${plan.kind === "subscription" ? "border-brand-300 ring-1 ring-brand-200" : ""}`}>
                <h2 className="font-semibold">{plan.name}</h2>
                <p className="mt-2 text-3xl font-bold">
                  {formatPrice(plan.price_cents, plan.currency, locale)}
                  {plan.kind === "subscription" && <span className="text-base font-normal text-ink-muted">{plan.billing_interval === "quarter" ? b.perQuarter : b.perMonth}</span>}
                </p>
                <ul className="mt-4 flex-1 space-y-2 text-sm">
                  {features.map((x) => (
                    <li key={x} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> {x}</li>
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
        <section className="card p-6">
          <h2 className="mb-3 font-semibold">{b.history}</h2>
          <ul className="divide-y divide-slate-100 text-sm">
            {ledger.data.map((l) => (
              <li key={l.id} className="flex justify-between py-2">
                <span>{b.reasons[l.reason] ?? l.reason} <span className="text-xs text-ink-muted">· {formatDate(l.created_at, locale)}</span></span>
                <span className={l.delta > 0 ? "text-emerald-700" : "text-ink-soft"}>{l.delta > 0 ? `+${l.delta}` : l.delta}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
