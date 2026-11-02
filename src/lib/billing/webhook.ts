import type Stripe from "stripe";
import { planIdFromPrice } from "./plans";

/** Persistence used by the webhook handler. Implemented with Supabase in production and in-memory in tests. */
export interface BillingStore {
  isProcessed(eventId: string): Promise<boolean>;
  markProcessed(eventId: string, type: string): Promise<void>;
  getPlan(planId: string): Promise<{ id: string; kind: "free" | "pack" | "subscription"; analyses_included: number } | null>;
  /** Must be idempotent on `ref` (unique external_ref). */
  addPaidCredits(userId: string, amount: number, ref: string): Promise<void>;
  /** Paid credits the user still has (sum of the paid ledger). */
  paidBalance(userId: string): Promise<number>;
  /** Removes paid credits (negative ledger entry). Must be idempotent on `ref`. */
  revokePaidCredits(userId: string, amount: number, ref: string): Promise<void>;
  /** Credits already removed (a positive number) by ledger rows whose ref is `key` or starts with `key:`. */
  revokedFor(userId: string, key: string): Promise<number>;
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

/**
 * Thrown by a store when the user no longer exists (e.g. the account was deleted, which also
 * cancels the subscription and later produces `customer.subscription.deleted`). The event is
 * recorded and ignored instead of failing forever and being retried by Stripe for days.
 */
export class UnknownUserError extends Error {
  constructor() {
    super("unknown_user");
  }
}

export type FetchSubscription = (id: string) => Promise<Stripe.Subscription>;
export type FetchPaymentIntent = (id: string) => Promise<Stripe.PaymentIntent>;

/**
 * The plan a subscription is on right now. Prices synced by `npm run stripe:sync` carry the lookup key
 * `cvmatch_<plan id>`, which follows plan switches made in the customer portal; the checkout metadata
 * only says which plan the subscription started on.
 */
function currentPlanId(sub: Stripe.Subscription): string | undefined {
  // Lookup key `cvmatch_<plan>`, else the synced product `cvmatch_<plan>` (a price can lose its lookup key).
  return planIdFromPrice(sub.items?.data?.[0]?.price) ?? sub.metadata?.plan_id;
}

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
  const planId = currentPlanId(sub);
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
  // "no_payment_required": a 100% promotion code; the pack is still granted.
  if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") return "awaiting_payment";
  const userId = session.metadata?.user_id || session.client_reference_id;
  const planId = session.metadata?.plan_id;
  if (!userId || !planId) return "ignored_missing_metadata";
  const plan = await store.getPlan(planId);
  if (!plan || plan.kind !== "pack") return "ignored_unknown_plan";
  await store.addPaidCredits(userId, plan.analyses_included, session.id);
  return "credits_added";
}

/**
 * Refund policy (CDC art. 49): a refunded pack loses the refunded share of its credits
 * (refunded amount / charged amount × credits in the pack, rounded up), never more than the paid credits
 * the user still has. `amount_refunded` is cumulative, so every later partial refund of the same charge
 * only removes the difference to what was already revoked for it (refs `refund:<charge id>[:<amount>]`).
 * Subscription refunds need no credit change: cancelling the subscription in Stripe ends Pro access
 * through `customer.subscription.deleted`.
 */
async function packMetadata(charge: { metadata?: Record<string, string> | null; payment_intent?: string | { id: string } | null }, fetchPaymentIntent?: FetchPaymentIntent) {
  let meta: Record<string, string> = charge.metadata ?? {};
  if (!meta.plan_id && charge.payment_intent && fetchPaymentIntent) {
    const piId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent.id;
    meta = (await fetchPaymentIntent(piId)).metadata ?? {};
  }
  return meta;
}

async function revokeShare(store: BillingStore, meta: Record<string, string>, share: number, key: string, ref: string) {
  const userId = meta.user_id;
  const planId = meta.plan_id;
  if (!userId || !planId) return "ignored_missing_metadata";
  const plan = await store.getPlan(planId);
  if (!plan || plan.kind !== "pack") return "ignored_not_pack";
  const due = Math.ceil(Math.min(1, share) * plan.analyses_included) - (await store.revokedFor(userId, key));
  const toRevoke = Math.min(due, await store.paidBalance(userId));
  if (toRevoke <= 0) return "refund_nothing_to_revoke";
  await store.revokePaidCredits(userId, toRevoke, ref);
  return "credits_revoked";
}

async function revokeRefundedPack(charge: Stripe.Charge, store: BillingStore, fetchPaymentIntent?: FetchPaymentIntent) {
  if (!charge.amount_refunded || !charge.amount) return "ignored";
  const meta = await packMetadata(charge, fetchPaymentIntent);
  return revokeShare(store, meta, charge.amount_refunded / charge.amount, `refund:${charge.id}`, `refund:${charge.id}:${charge.amount_refunded}`);
}

/**
 * A dispute (chargeback) takes the money back like a refund: the disputed share of the pack is revoked
 * when the dispute opens. If the dispute is later won, restore the credits by hand (admin_adjustment).
 */
async function revokeDisputedPack(dispute: Stripe.Dispute, store: BillingStore, fetchPaymentIntent?: FetchPaymentIntent) {
  if (!dispute.payment_intent || !fetchPaymentIntent) return "ignored";
  const piId = typeof dispute.payment_intent === "string" ? dispute.payment_intent : dispute.payment_intent.id;
  const pi = await fetchPaymentIntent(piId);
  const charged = pi.amount_received || pi.amount;
  if (!charged || !dispute.amount) return "ignored";
  return revokeShare(store, pi.metadata ?? {}, dispute.amount / charged, `dispute:${dispute.id}`, `dispute:${dispute.id}`);
}

/**
 * Handles verified Stripe events. Idempotent: events are processed once, and
 * every write is itself idempotent (credits keyed by checkout session id,
 * subscriptions upserted by user), so retries are safe.
 */
export async function handleStripeEvent(
  event: Stripe.Event,
  store: BillingStore,
  fetchSubscription: FetchSubscription,
  fetchPaymentIntent?: FetchPaymentIntent,
): Promise<string> {
  if (await store.isProcessed(event.id)) return "duplicate";
  let outcome = "ignored";
  try {
    outcome = await dispatch(event, store, fetchSubscription, fetchPaymentIntent);
  } catch (err) {
    if (!(err instanceof UnknownUserError)) throw err;
    outcome = "ignored_unknown_user";
  }
  await store.markProcessed(event.id, event.type);
  return outcome;
}

async function dispatch(event: Stripe.Event, store: BillingStore, fetchSubscription: FetchSubscription, fetchPaymentIntent?: FetchPaymentIntent): Promise<string> {
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
    case "charge.refunded":
      outcome = await revokeRefundedPack(event.data.object as Stripe.Charge, store, fetchPaymentIntent);
      break;
    case "charge.dispute.created":
      outcome = await revokeDisputedPack(event.data.object as Stripe.Dispute, store, fetchPaymentIntent);
      break;
    default:
      outcome = "ignored";
  }
  return outcome;
}
