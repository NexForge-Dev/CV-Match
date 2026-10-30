import type Stripe from "stripe";
import { FALLBACK_PLANS } from "./plans";

/**
 * Maps a verified Stripe event to NexForge panel plan events. Pure (no I/O) so it is
 * unit-tested; the webhook route resolves the user id and sends them.
 */

export type BillingEventName = "plan_activated" | "plan_changed" | "plan_canceled" | "payment_failed";

export interface BillingAnalyticsEvent {
  event: BillingEventName;
  userId?: string;
  customerId?: string;
  properties: Record<string, string | number>;
}

const LOOKUP_PREFIX = "cvmatch_";

function planFromLookup(key: string | null | undefined): string | undefined {
  return key?.startsWith(LOOKUP_PREFIX) ? key.slice(LOOKUP_PREFIX.length) : undefined;
}

function periodOf(planId: string | undefined): string | undefined {
  const plan = FALLBACK_PLANS.find((p) => p.id === planId);
  if (!plan) return planId?.startsWith("pack_") ? "one_off" : undefined;
  return plan.kind === "pack" ? "one_off" : (plan.billing_interval ?? "month");
}

function customerIdOf(customer: string | { id: string } | null | undefined): string | undefined {
  if (!customer) return undefined;
  return typeof customer === "string" ? customer : customer.id;
}

const REASONS: Record<string, string> = {
  too_expensive: "price",
  missing_features: "missing_feature",
  unused: "not_using",
  switched_service: "switched_competitor",
  low_quality: "technical_issue",
  customer_service: "other",
  too_complex: "other",
  other: "other",
};

function compact(props: Record<string, string | number | undefined>): Record<string, string | number> {
  return Object.fromEntries(Object.entries(props).filter(([, v]) => v !== undefined && v !== "")) as Record<string, string | number>;
}

function subscriptionPlan(sub: Stripe.Subscription): string | undefined {
  return planFromLookup(sub.items?.data?.[0]?.price?.lookup_key) ?? sub.metadata?.plan_id;
}

export function billingAnalyticsEvents(event: Stripe.Event): BillingAnalyticsEvent[] {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const s = event.data.object as Stripe.Checkout.Session;
      // Delayed payment methods complete later via async_payment_succeeded.
      if (event.type === "checkout.session.completed" && s.payment_status === "unpaid") return [];
      const plan = s.metadata?.plan_id;
      if (!plan) return [];
      return [
        {
          event: "plan_activated",
          userId: s.metadata?.user_id || s.client_reference_id || undefined,
          customerId: customerIdOf(s.customer),
          properties: compact({
            plan,
            billing_period: s.mode === "payment" ? "one_off" : periodOf(plan),
            amount_cents: s.amount_total ?? undefined,
            currency: s.currency?.toUpperCase(),
          }),
        },
      ];
    }
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const prev = (event.data.previous_attributes ?? {}) as Partial<Stripe.Subscription>;
      const base = { userId: sub.metadata?.user_id || undefined, customerId: customerIdOf(sub.customer) };
      const out: BillingAnalyticsEvent[] = [];
      const plan = subscriptionPlan(sub);
      const fromPlan = planFromLookup(prev.items?.data?.[0]?.price?.lookup_key);
      if (prev.items && fromPlan && plan && fromPlan !== plan) {
        out.push({
          ...base,
          event: "plan_changed",
          properties: compact({ from_plan: fromPlan, to_plan: plan, billing_period: periodOf(plan), amount_cents: sub.items.data[0]?.price?.unit_amount ?? undefined }),
        });
      }
      if (prev.status && prev.status !== "past_due" && sub.status === "past_due") {
        out.push({ ...base, event: "payment_failed", properties: compact({ plan }) });
      }
      return out;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const details = sub.cancellation_details;
      const reason = details?.reason === "payment_failed" ? "payment_failed" : REASONS[details?.feedback ?? ""];
      return [
        {
          event: "plan_canceled",
          userId: sub.metadata?.user_id || undefined,
          customerId: customerIdOf(sub.customer),
          properties: compact({ plan: subscriptionPlan(sub), reason }),
        },
      ];
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      return [{ event: "payment_failed", customerId: customerIdOf(invoice.customer), properties: {} }];
    }
    default:
      return [];
  }
}
