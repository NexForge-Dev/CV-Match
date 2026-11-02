import { describe, expect, it } from "vitest";
import type Stripe from "stripe";
import { handleStripeEvent, type BillingStore } from "@/lib/billing/webhook";
import { FALLBACK_PLANS, parsePlans, planFeaturesSchema } from "@/lib/billing/plans";

function memoryStore() {
  const processed = new Set<string>();
  const ledger = new Map<string, { userId: string; amount: number }>();
  const subs = new Map<string, Parameters<BillingStore["upsertSubscription"]>[0]>();
  const customers = new Map([["cus_1", "user-1"]]);
  const store: BillingStore = {
    async isProcessed(id) {
      return processed.has(id);
    },
    async markProcessed(id) {
      processed.add(id);
    },
    async getPlan(id) {
      const p = FALLBACK_PLANS.find((x) => x.id === id);
      return p ? { id: p.id, kind: p.kind, analyses_included: p.analyses_included } : null;
    },
    async addPaidCredits(userId, amount, ref) {
      if (!ledger.has(ref)) ledger.set(ref, { userId, amount });
    },
    async paidBalance(userId) {
      return [...ledger.values()].filter((e) => e.userId === userId).reduce((sum, e) => sum + e.amount, 0);
    },
    async revokePaidCredits(userId, amount, ref) {
      if (!ledger.has(ref)) ledger.set(ref, { userId, amount: -amount });
    },
    async upsertSubscription(s) {
      subs.set(s.userId, s);
    },
    async userIdForCustomer(id) {
      return customers.get(id) ?? null;
    },
    async getSubscription(userId) {
      const s = subs.get(userId);
      return s ? { stripeSubscriptionId: s.stripeSubscriptionId, status: s.status } : null;
    },
  };
  return { store, processed, ledger, subs };
}

const event = (id: string, type: string, object: unknown) => ({ id, type, data: { object } }) as unknown as Stripe.Event;

const subscription = (status: string, extra: Record<string, unknown> = {}) =>
  ({
    id: "sub_1",
    customer: "cus_1",
    status,
    cancel_at_period_end: false,
    metadata: { user_id: "user-1", plan_id: "pro_monthly" },
    items: { data: [{ current_period_start: 1_700_000_000, current_period_end: 1_702_592_000 }] },
    ...extra,
  }) as unknown as Stripe.Subscription;

const noFetch = async () => {
  throw new Error("should not fetch");
};

describe("stripe webhook handler", () => {
  it("adds pack credits once per checkout session, even if the event is retried", async () => {
    const { store, ledger } = memoryStore();
    const session = { id: "cs_1", mode: "payment", payment_status: "paid", metadata: { user_id: "user-1", plan_id: "pack_10" }, client_reference_id: "user-1" };
    expect(await handleStripeEvent(event("evt_1", "checkout.session.completed", session), store, noFetch)).toBe("credits_added");
    expect(await handleStripeEvent(event("evt_1", "checkout.session.completed", session), store, noFetch)).toBe("duplicate");
    // Same session delivered under a different event id (e.g. async_payment_succeeded) is still credited once.
    await handleStripeEvent(event("evt_2", "checkout.session.async_payment_succeeded", session), store, noFetch);
    expect([...ledger.values()]).toEqual([{ userId: "user-1", amount: 10 }]);
  });

  it("removes the refunded share of a pack's credits once, capped at the remaining paid balance", async () => {
    const { store, ledger } = memoryStore();
    const paid = { id: "cs_r", mode: "payment", payment_status: "paid", metadata: { user_id: "user-1", plan_id: "pack_10" } };
    await handleStripeEvent(event("evt_r0", "checkout.session.completed", paid), store, noFetch);
    // Customer used 3 analyses, then got a 70% proportional refund (CDC art. 49).
    ledger.set("analysis:1", { userId: "user-1", amount: -3 });
    const charge = { id: "ch_1", amount: 1990, amount_refunded: 1393, payment_intent: "pi_1", metadata: {} };
    const fetchPi = async () => ({ metadata: { user_id: "user-1", plan_id: "pack_10" } }) as unknown as Stripe.PaymentIntent;
    expect(await handleStripeEvent(event("evt_r1", "charge.refunded", charge), store, noFetch, fetchPi)).toBe("credits_revoked");
    expect(ledger.get("refund:ch_1")).toEqual({ userId: "user-1", amount: -7 });
    expect(await store.paidBalance("user-1")).toBe(0);
    // Retried event or a second refund event of the same charge: nothing more is removed.
    expect(await handleStripeEvent(event("evt_r1", "charge.refunded", charge), store, noFetch, fetchPi)).toBe("duplicate");
    expect(await handleStripeEvent(event("evt_r2", "charge.refunded", { ...charge, amount_refunded: 1990 }), store, noFetch, fetchPi)).toBe("refund_nothing_to_revoke");
    expect(await store.paidBalance("user-1")).toBe(0);
  });

  it("never revokes more than the user still has, and ignores refunds of subscriptions", async () => {
    const { store, ledger } = memoryStore();
    ledger.set("cs_x", { userId: "user-1", amount: 10 });
    ledger.set("analysis:x", { userId: "user-1", amount: -8 });
    const full = { id: "ch_2", amount: 1990, amount_refunded: 1990, metadata: { user_id: "user-1", plan_id: "pack_10" } };
    expect(await handleStripeEvent(event("evt_r3", "charge.refunded", full), store, noFetch)).toBe("credits_revoked");
    expect(await store.paidBalance("user-1")).toBe(0);
    const sub = { id: "ch_3", amount: 2990, amount_refunded: 2990, metadata: { user_id: "user-1", plan_id: "pro_monthly" } };
    expect(await handleStripeEvent(event("evt_r4", "charge.refunded", sub), store, noFetch)).toBe("ignored_not_pack");
  });

  it("does not credit unpaid sessions or unknown plans", async () => {
    const { store, ledger } = memoryStore();
    await handleStripeEvent(event("evt_3", "checkout.session.completed", { id: "cs_2", mode: "payment", payment_status: "unpaid", metadata: { user_id: "u", plan_id: "pack_10" } }), store, noFetch);
    await handleStripeEvent(event("evt_4", "checkout.session.completed", { id: "cs_3", mode: "payment", payment_status: "paid", metadata: { user_id: "u", plan_id: "pro_monthly" } }), store, noFetch);
    await handleStripeEvent(event("evt_5", "checkout.session.completed", { id: "cs_4", mode: "payment", payment_status: "paid", metadata: { user_id: "u", plan_id: "nope" } }), store, noFetch);
    expect(ledger.size).toBe(0);
  });

  it("syncs subscriptions from checkout and lifecycle events using Stripe's current state", async () => {
    const { store, subs } = memoryStore();
    let live = subscription("active");
    const fetchSub = async () => live;
    await handleStripeEvent(event("evt_6", "checkout.session.completed", { id: "cs_5", mode: "subscription", subscription: "sub_1", metadata: { user_id: "user-1", plan_id: "pro_monthly" } }), store, fetchSub);
    expect(subs.get("user-1")).toMatchObject({ status: "active", planId: "pro_monthly", currentPeriodEnd: new Date(1_702_592_000_000).toISOString() });

    // Update: cancel at period end (access continues until the period ends).
    live = subscription("active", { cancel_at_period_end: true });
    await handleStripeEvent(event("evt_7", "customer.subscription.updated", live), store, fetchSub);
    expect(subs.get("user-1")).toMatchObject({ status: "active", cancelAtPeriodEnd: true });

    // Payment declined on renewal: Stripe moves the subscription to past_due -> no subscription quota.
    live = subscription("past_due");
    await handleStripeEvent(event("evt_8", "customer.subscription.updated", live), store, fetchSub);
    expect(subs.get("user-1")?.status).toBe("past_due");

    // Period over: deleted -> canceled.
    live = subscription("canceled");
    await handleStripeEvent(event("evt_9", "customer.subscription.deleted", live), store, fetchSub);
    expect(subs.get("user-1")?.status).toBe("canceled");
  });

  it("a stale out-of-order event cannot resurrect a canceled subscription", async () => {
    const { store, subs } = memoryStore();
    const fetchSub = async () => subscription("canceled"); // Stripe's current truth
    // An old "active" update arrives after the cancellation.
    await handleStripeEvent(event("evt_old", "customer.subscription.updated", subscription("active")), store, fetchSub);
    expect(subs.get("user-1")?.status).toBe("canceled");
  });

  it("an event about an old subscription does not replace the user's newer live one", async () => {
    const { store, subs } = memoryStore();
    await store.upsertSubscription({ userId: "user-1", planId: "pro_monthly", status: "active", stripeSubscriptionId: "sub_new", currentPeriodStart: null, currentPeriodEnd: null, cancelAtPeriodEnd: false });
    const outcome = await handleStripeEvent(event("evt_10", "customer.subscription.deleted", subscription("canceled")), store, async () => subscription("canceled"));
    expect(outcome).toBe("ignored_superseded");
    expect(subs.get("user-1")).toMatchObject({ stripeSubscriptionId: "sub_new", status: "active" });
  });

  it("subscription events without a plan are ignored safely", async () => {
    const { store, subs } = memoryStore();
    const outcome = await handleStripeEvent(event("evt_11", "customer.subscription.updated", subscription("active")), store, async () => subscription("active", { metadata: {} }));
    expect(outcome).toBe("ignored_missing_metadata");
    expect(subs.size).toBe(0);
  });

  it("a failed asynchronous payment never grants credits", async () => {
    const { store, ledger } = memoryStore();
    const session = { id: "cs_9", mode: "payment", payment_status: "unpaid", metadata: { user_id: "user-1", plan_id: "pack_10" } };
    expect(await handleStripeEvent(event("evt_12", "checkout.session.completed", session), store, noFetch)).toBe("awaiting_payment");
    expect(await handleStripeEvent(event("evt_13", "checkout.session.async_payment_failed", session), store, noFetch)).toBe("ignored");
    expect(ledger.size).toBe(0);
  });

  it("ignores unrelated events but records them as processed", async () => {
    const { store, processed } = memoryStore();
    expect(await handleStripeEvent(event("evt_99", "invoice.created", {}), store, noFetch)).toBe("ignored");
    expect(processed.has("evt_99")).toBe(true);
  });
});

describe("plans configuration", () => {
  it("parses plans from database rows and applies feature defaults", () => {
    const plans = parsePlans([
      { id: "b", name: "B", kind: "pack", price_cents: 900, currency: "eur", billing_interval: null, analyses_included: 10, features: {}, sort: 2 },
      { id: "a", name: "A", kind: "free", price_cents: 0, currency: "eur", billing_interval: null, analyses_included: 1, features: { max_suggestions: 3 }, sort: 1 },
      { id: "broken", kind: "pack" },
    ]);
    expect(plans.map((p) => p.id)).toEqual(["a", "b"]);
    expect(plans[1].features).toEqual(planFeaturesSchema.parse({}));
    expect(plans[0].features.max_suggestions).toBe(3);
  });

  it("hypothetical prices respect the configured ranges", () => {
    const pack = FALLBACK_PLANS.find((p) => p.kind === "pack")!;
    const pro = FALLBACK_PLANS.find((p) => p.kind === "subscription")!;
    // BRL (Brazil): pack R$ 19,90, Pro monthly R$ 29,90.
    expect(pack.currency).toBe("brl");
    expect(pack.price_cents).toBeGreaterThanOrEqual(1000);
    expect(pack.price_cents).toBeLessThanOrEqual(3000);
    expect(pro.price_cents).toBeGreaterThanOrEqual(1900);
    expect(pro.price_cents).toBeLessThanOrEqual(5000);
  });
});
