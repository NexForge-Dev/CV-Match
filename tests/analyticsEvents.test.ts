import { describe, expect, it } from "vitest";
import type Stripe from "stripe";
import { billingAnalyticsEvents } from "@/lib/billing/analyticsEvents";

const ev = (type: string, object: unknown, previous_attributes?: unknown) =>
  ({ id: "evt_1", type, data: { object, previous_attributes } }) as unknown as Stripe.Event;

describe("billingAnalyticsEvents (NexForge panel)", () => {
  it("maps a paid pack checkout to a one-off activation", () => {
    const out = billingAnalyticsEvents(
      ev("checkout.session.completed", {
        mode: "payment",
        payment_status: "paid",
        metadata: { user_id: "u1", plan_id: "pack_10" },
        amount_total: 990,
        currency: "eur",
        customer: "cus_1",
      }),
    );
    expect(out).toEqual([
      { event: "plan_activated", userId: "u1", customerId: "cus_1", properties: { plan: "pack_10", billing_period: "one_off", amount_cents: 990, currency: "EUR" } },
    ]);
  });

  it("uses the plan interval for subscriptions and waits for async payments", () => {
    const sub = billingAnalyticsEvents(
      ev("checkout.session.completed", { mode: "subscription", payment_status: "paid", metadata: { user_id: "u1", plan_id: "pro_quarterly" }, amount_total: 3490, currency: "eur" }),
    );
    expect(sub[0].properties).toMatchObject({ plan: "pro_quarterly", billing_period: "quarter" });
    expect(billingAnalyticsEvents(ev("checkout.session.completed", { mode: "payment", payment_status: "unpaid", metadata: { plan_id: "pack_10" } }))).toEqual([]);
  });

  it("detects plan switches and past-due transitions", () => {
    const item = (key: string) => ({ data: [{ price: { lookup_key: key, unit_amount: 3490 } }] });
    const out = billingAnalyticsEvents(
      ev(
        "customer.subscription.updated",
        { status: "past_due", customer: "cus_1", metadata: { user_id: "u1" }, items: item("cvmatch_pro_quarterly") },
        { status: "active", items: item("cvmatch_pro_monthly") },
      ),
    );
    // The decline itself is reported once, from invoice.payment_failed, not again from the past_due transition.
    expect(out.map((e) => e.event)).toEqual(["plan_changed"]);
    expect(out[0].properties).toMatchObject({ from_plan: "pro_monthly", to_plan: "pro_quarterly", billing_period: "quarter" });
  });

  it("detects plan switches without lookup keys (synced product id or the stored price ids)", () => {
    const byProduct = billingAnalyticsEvents(
      ev(
        "customer.subscription.updated",
        { status: "active", customer: "cus_1", metadata: { user_id: "u1", plan_id: "pro_monthly" }, items: { data: [{ price: { id: "price_q", lookup_key: null, product: "cvmatch_pro_quarterly", unit_amount: 6990 } }] } },
        { items: { data: [{ price: { id: "price_m", lookup_key: null, product: "cvmatch_pro_monthly" } }] } },
      ),
    );
    expect(byProduct).toHaveLength(1);
    expect(byProduct[0]).toMatchObject({ event: "plan_changed", properties: { from_plan: "pro_monthly", to_plan: "pro_quarterly", amount_cents: 6990 } });

    const byPriceId = billingAnalyticsEvents(
      ev(
        "customer.subscription.updated",
        { status: "active", customer: "cus_1", metadata: {}, items: { data: [{ price: { id: "price_q", lookup_key: null, product: "prod_x" } }] } },
        { items: { data: [{ price: { id: "price_m", lookup_key: null, product: "prod_y" } }] } },
      ),
      { price_m: "pro_monthly", price_q: "pro_quarterly" },
    );
    expect(byPriceId.map((e) => e.properties)).toEqual([{ from_plan: "pro_monthly", to_plan: "pro_quarterly", billing_period: "quarter" }]);

    // Another product's prices on the shared Stripe account are never mistaken for a CV Match plan.
    const other = billingAnalyticsEvents(
      ev(
        "customer.subscription.updated",
        { status: "active", customer: "cus_1", metadata: {}, items: { data: [{ price: { id: "p1", lookup_key: "automanager_pro", product: "prod_a" } }] } },
        { items: { data: [{ price: { id: "p2", lookup_key: "automanager_basic", product: "prod_b" } }] } },
      ),
    );
    expect(other).toEqual([]);
  });

  it("reports a declined invoice once per invoice, with its plan", () => {
    const invoice = (attempt: number) => ({
      id: "in_1",
      customer: "cus_3",
      attempt_count: attempt,
      lines: { data: [{ pricing: { price_details: { price: "price_m", product: "cvmatch_pro_monthly" } } }] },
    });
    const first = billingAnalyticsEvents(ev("invoice.payment_failed", invoice(1)));
    const retry = billingAnalyticsEvents(ev("invoice.payment_failed", invoice(2)));
    expect(first).toEqual([{ event: "payment_failed", customerId: "cus_3", properties: { plan: "pro_monthly" }, onceKey: "payment_failed:in_1" }]);
    // Same dedupe key for every retry of the invoice, so the panel counts one failure.
    expect(retry[0].onceKey).toBe(first[0].onceKey);
    const viaMetadata = billingAnalyticsEvents(ev("invoice.payment_failed", { id: "in_2", customer: "cus_3", lines: { data: [] }, parent: { subscription_details: { metadata: { plan_id: "pro_quarterly" } } } }));
    expect(viaMetadata[0].properties).toEqual({ plan: "pro_quarterly" });
  });

  it("maps cancellations with the Stripe feedback reason", () => {
    const out = billingAnalyticsEvents(
      ev("customer.subscription.deleted", {
        customer: { id: "cus_9" },
        metadata: {},
        items: { data: [{ price: { lookup_key: "cvmatch_pro_monthly" } }] },
        cancellation_details: { reason: "cancellation_requested", feedback: "too_expensive" },
      }),
    );
    expect(out).toEqual([{ event: "plan_canceled", userId: undefined, customerId: "cus_9", properties: { plan: "pro_monthly", reason: "price" } }]);
  });

  it("ignores unrelated events and never carries personal data", () => {
    expect(billingAnalyticsEvents(ev("customer.created", { email: "a@b.c" }))).toEqual([]);
    const failed = billingAnalyticsEvents(ev("invoice.payment_failed", { customer: "cus_2", customer_email: "a@b.c" }));
    expect(JSON.stringify(failed)).not.toContain("@");
  });
});
