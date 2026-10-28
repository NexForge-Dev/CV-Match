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
    async upsertSubscription(s) {
      subs.set(s.userId, s);
    },
    async userIdForCustomer(id) {
      return customers.get(id) ?? null;
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
    const session = { id: "cs_1", mode: "payment", payment_status: "paid", metadata: { user_id: "user-1", plan_id: "pack_5" }, client_reference_id: "user-1" };
    expect(await handleStripeEvent(event("evt_1", "checkout.session.completed", session), store, noFetch)).toBe("credits_added");
    expect(await handleStripeEvent(event("evt_1", "checkout.session.completed", session), store, noFetch)).toBe("duplicate");
    // Same session delivered under a different event id (e.g. async_payment_succeeded) is still credited once.
    await handleStripeEvent(event("evt_2", "checkout.session.async_payment_succeeded", session), store, noFetch);
    expect([...ledger.values()]).toEqual([{ userId: "user-1", amount: 5 }]);
  });

  it("does not credit unpaid sessions or unknown plans", async () => {
    const { store, ledger } = memoryStore();
    await handleStripeEvent(event("evt_3", "checkout.session.completed", { id: "cs_2", mode: "payment", payment_status: "unpaid", metadata: { user_id: "u", plan_id: "pack_5" } }), store, noFetch);
    await handleStripeEvent(event("evt_4", "checkout.session.completed", { id: "cs_3", mode: "payment", payment_status: "paid", metadata: { user_id: "u", plan_id: "pro_monthly" } }), store, noFetch);
    await handleStripeEvent(event("evt_5", "checkout.session.completed", { id: "cs_4", mode: "payment", payment_status: "paid", metadata: { user_id: "u", plan_id: "nope" } }), store, noFetch);
    expect(ledger.size).toBe(0);
  });

  it("syncs subscriptions from checkout and lifecycle events", async () => {
    const { store, subs } = memoryStore();
    const fetchSub = async () => subscription("active");
    await handleStripeEvent(event("evt_6", "checkout.session.completed", { id: "cs_5", mode: "subscription", subscription: "sub_1", metadata: { user_id: "user-1", plan_id: "pro_monthly" } }), store, fetchSub);
    expect(subs.get("user-1")).toMatchObject({ status: "active", planId: "pro_monthly", currentPeriodEnd: new Date(1_702_592_000_000).toISOString() });

    await handleStripeEvent(event("evt_7", "customer.subscription.updated", subscription("active", { cancel_at_period_end: true })), store, noFetch);
    expect(subs.get("user-1")?.cancelAtPeriodEnd).toBe(true);

    await handleStripeEvent(event("evt_8", "customer.subscription.deleted", subscription("canceled", { metadata: {} })), store, noFetch);
    // Without metadata the user is resolved via the customer id; plan is required, so the event is ignored safely.
    expect(subs.get("user-1")?.status).toBe("active");
  });

  it("ignores unrelated events but records them as processed", async () => {
    const { store, processed } = memoryStore();
    expect(await handleStripeEvent(event("evt_9", "invoice.created", {}), store, noFetch)).toBe("ignored");
    expect(processed.has("evt_9")).toBe(true);
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
    expect(pack.price_cents).toBeGreaterThanOrEqual(500);
    expect(pack.price_cents).toBeLessThanOrEqual(1000);
    expect(pro.price_cents).toBeGreaterThanOrEqual(900);
    expect(pro.price_cents).toBeLessThanOrEqual(1500);
  });
});
