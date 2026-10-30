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
    expect(out.map((e) => e.event)).toEqual(["plan_changed", "payment_failed"]);
    expect(out[0].properties).toMatchObject({ from_plan: "pro_monthly", to_plan: "pro_quarterly", billing_period: "quarter" });
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
