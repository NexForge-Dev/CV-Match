import type Stripe from "stripe";

/** Persistence used by the webhook handler. Implemented with Supabase in production and in-memory in tests. */
export interface BillingStore {
  isProcessed(eventId: string): Promise<boolean>;
  markProcessed(eventId: string, type: string): Promise<void>;
  getPlan(planId: string): Promise<{ id: string; kind: "free" | "pack" | "subscription"; analyses_included: number } | null>;
  /** Must be idempotent on `ref` (unique external_ref). */
  addPaidCredits(userId: string, amount: number, ref: string): Promise<void>;
  upsertSubscription(sub: {
    userId: string;
    planId: string;
    status: string;
    stripeSubscriptionId: string;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  }): Promise<void>;
  userIdForCustomer(customerId: string): Promise<string | null>;
  getSubscription(userId: string): Promise<{ stripeSubscriptionId: string | null; status: string } | null>;
}

const LIVE = ["active", "trialing", "past_due"];

export type FetchSubscription = (id: string) => Promise<Stripe.Subscription>;

const iso = (unix: number | null | undefined) => (unix ? new Date(unix * 1000).toISOString() : null);

/**
 * Stripe does not guarantee event order, so the event payload is never trusted
 * as the current state: the subscription is re-read from Stripe and that
 * snapshot is stored. A stale event can therefore never resurrect a canceled
 * subscription or undo a renewal.
 */
async function syncSubscription(eventSub: Stripe.Subscription, store: BillingStore, fetchSubscription: FetchSubscription, fallbackUserId?: string) {
  const sub = await fetchSubscription(eventSub.id);
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const userId = sub.metadata?.user_id || fallbackUserId || (await store.userIdForCustomer(customerId));
  const planId = sub.metadata?.plan_id;
  if (!userId || !planId) return "ignored_missing_metadata";
  const plan = await store.getPlan(planId);
  if (!plan || plan.kind !== "subscription") return "ignored_unknown_plan";
  // One subscription row per user: an update about an old, ended subscription must not replace a newer live one.
  const current = await store.getSubscription(userId);
  if (current?.stripeSubscriptionId && current.stripeSubscriptionId !== sub.id && LIVE.includes(current.status) && !LIVE.includes(sub.status)) {
    return "ignored_superseded";
  }
  // Since API 2025-03-31 the billing period lives on subscription items.
  const item = sub.items?.data?.[0];
  await store.upsertSubscription({
    userId,
    planId,
    status: sub.status,
    stripeSubscriptionId: sub.id,
    currentPeriodStart: iso(item?.current_period_start),
    currentPeriodEnd: iso(item?.current_period_end),
    cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
  });
  return "subscription_synced";
}

async function fulfillPack(session: Stripe.Checkout.Session, store: BillingStore) {
  if (session.payment_status !== "paid") return "awaiting_payment";
  const userId = session.metadata?.user_id || session.client_reference_id;
  const planId = session.metadata?.plan_id;
  if (!userId || !planId) return "ignored_missing_metadata";
  const plan = await store.getPlan(planId);
  if (!plan || plan.kind !== "pack") return "ignored_unknown_plan";
  await store.addPaidCredits(userId, plan.analyses_included, session.id);
  return "credits_added";
}

/**
 * Handles verified Stripe events. Idempotent: events are processed once, and
 * every write is itself idempotent (credits keyed by checkout session id,
 * subscriptions upserted by user), so retries are safe.
 */
export async function handleStripeEvent(event: Stripe.Event, store: BillingStore, fetchSubscription: FetchSubscription): Promise<string> {
  if (await store.isProcessed(event.id)) return "duplicate";
  let outcome = "ignored";
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === "payment") outcome = await fulfillPack(session, store);
      else if (session.mode === "subscription" && session.subscription) {
        const subId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
        outcome = await syncSubscription({ id: subId } as Stripe.Subscription, store, fetchSubscription, session.metadata?.user_id ?? session.client_reference_id ?? undefined);
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      outcome = await syncSubscription(event.data.object as Stripe.Subscription, store, fetchSubscription);
      break;
    default:
      outcome = "ignored";
  }
  await store.markProcessed(event.id, event.type);
  return outcome;
}
