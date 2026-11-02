import type Stripe from "stripe";
import { FALLBACK_PLANS, planIdFromPrice } from "./plans";

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
  /** Dedupe key for the panel (NexForge onceId); the webhook uses the Stripe event id when absent. */
  onceKey?: string;
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

function subscriptionPlan(sub: Pick<Stripe.Subscription, "items" | "metadata">, priceToPlan: Record<string, string>): string | undefined {
  return planIdFromPrice(sub.items?.data?.[0]?.price, priceToPlan) ?? sub.metadata?.plan_id;
}

/** Plan of an invoice line: its price (any API version shape), else the subscription metadata copied onto the invoice. */
function invoicePlan(invoice: Stripe.Invoice, priceToPlan: Record<string, string>): string | undefined {
  const line = invoice.lines?.data?.[0] as unknown as
    | { price?: Parameters<typeof planIdFromPrice>[0]; pricing?: { price_details?: { price?: string; product?: string } } }
    | undefined;
  const details = line?.pricing?.price_details;
  const fromLine =
    planIdFromPrice(line?.price, priceToPlan) ??
    (details?.price ? planIdFromPrice({ id: details.price, product: details.product }, priceToPlan) : undefined);
  const parent = (invoice as unknown as { parent?: { subscription_details?: { metadata?: Record<string, string> | null } } }).parent;
  return fromLine ?? parent?.subscription_details?.metadata?.plan_id ?? undefined;
}

/**
 * @param priceToPlan Stripe price id -> plan id from the `plans` table, so plan switches are recognised even when a
 *   price has no `cvmatch_` lookup key.
 */
export function billingAnalyticsEvents(event: Stripe.Event, priceToPlan: Record<string, string> = {}): BillingAnalyticsEvent[] {
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
      const plan = subscriptionPlan(sub, priceToPlan);
      // The previous price is recognised the same way as the current one (lookup key, product or stored price id).
      const fromPlan = prev.items ? planIdFromPrice(prev.items.data?.[0]?.price, priceToPlan) : undefined;
      if (fromPlan && plan && fromPlan !== plan) {
        out.push({
          ...base,
          event: "plan_changed",
          properties: compact({ from_plan: fromPlan, to_plan: plan, billing_period: periodOf(plan), amount_cents: sub.items.data[0]?.price?.unit_amount ?? undefined }),
        });
      }
      // A declined renewal is reported once, from invoice.payment_failed (the past_due transition is the same failure).
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
          properties: compact({ plan: subscriptionPlan(sub, priceToPlan), reason }),
        },
      ];
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      // Stripe retries a failed invoice several times, each with its own event: one failure per invoice.
      return [
        {
          event: "payment_failed",
          customerId: customerIdOf(invoice.customer),
          properties: compact({ plan: invoicePlan(invoice, priceToPlan) }),
          onceKey: invoice.id ? `payment_failed:${invoice.id}` : undefined,
        },
      ];
    }
    default:
      return [];
  }
}
