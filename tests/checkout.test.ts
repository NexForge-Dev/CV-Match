import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));
vi.mock("@/lib/auth", () => ({ getApiUser: async () => ({ user: { id: "user-1", email: "a@test.dev" }, supabase: {} }) }));
vi.mock("@/lib/analytics", () => ({ track: () => {} }));
vi.mock("@/lib/i18n/server", async () => {
  const { dictionaries } = await import("@/lib/i18n/dictionaries");
  return { getDictionary: async () => ({ locale: "es", t: dictionaries.es }) };
});

const PLAN = { id: "pack_10", name: "Analysis pack", kind: "pack", price_cents: 990, currency: "eur", billing_interval: null, analyses_included: 10, features: {}, stripe_price_id: "price_1", active: true, sort: 1 };
const adminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      adminFrom(table);
      const rows = table === "plans" ? [PLAN] : [];
      const q: Record<string, unknown> = {};
      q.select = () => q;
      q.eq = () => q;
      q.upsert = async () => ({ error: null });
      q.maybeSingle = async () => ({ data: table === "billing_customers" ? { stripe_customer_id: "cus_1" } : null });
      q.single = q.maybeSingle;
      q.then = (resolve: (v: unknown) => unknown) => resolve({ data: rows });
      return q;
    },
  }),
}));

const createSession = vi.fn(async (_params: Record<string, unknown>) => ({ url: "https://checkout.stripe.com/c/pay/cs_test_1" }));
vi.mock("@/lib/billing/stripe", () => ({
  getStripe: () => ({ checkout: { sessions: { create: createSession } }, subscriptions: { list: async () => ({ data: [] }) }, customers: { create: async () => ({ id: "cus_1" }) } }),
}));

async function checkout(body: unknown) {
  const { POST } = await import("@/app/api/billing/checkout/route");
  const res = await POST(new Request("http://localhost/api/billing/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }), {});
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

beforeEach(() => {
  createSession.mockClear();
  adminFrom.mockClear();
});

describe("checkout requires the EU withdrawal-right waiver", () => {
  it("rejects a checkout without the consent flag before touching the database or Stripe", async () => {
    for (const body of [{ planId: "pack_10" }, { planId: "pack_10", withdrawalConsent: false }, { planId: "pack_10", withdrawalConsent: "true" }]) {
      expect(await checkout(body)).toEqual({ status: 400, body: { error: "invalid_input", detail: "withdrawal_consent_required" } });
    }
    expect(adminFrom).not.toHaveBeenCalled();
    expect(createSession).not.toHaveBeenCalled();
  });

  it("records the consent in the Stripe session and restates it at checkout", async () => {
    const res = await checkout({ planId: "pack_10", withdrawalConsent: true });
    expect(res).toEqual({ status: 200, body: { url: "https://checkout.stripe.com/c/pay/cs_test_1" } });
    const params = createSession.mock.calls[0][0] as {
      metadata: Record<string, string>;
      payment_intent_data: { metadata: Record<string, string> };
      custom_text: { submit: { message: string } };
    };
    expect(params.metadata).toMatchObject({ user_id: "user-1", plan_id: "pack_10", withdrawal_waiver: "accepted" });
    expect(params.metadata.withdrawal_waiver_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(params.metadata.withdrawal_waiver_version).toBeTruthy();
    expect(params.payment_intent_data.metadata).toMatchObject({ withdrawal_waiver: "accepted" });
    // Restated in the buyer's language (Spanish here), within Stripe's 1200-character limit.
    expect(params.custom_text.submit.message).toMatch(/desistimiento/);
    expect(params.custom_text.submit.message.length).toBeLessThanOrEqual(1200);
  });
});

describe("withdrawal waiver wording", () => {
  it("exists in every language and fits Stripe's custom text limit", async () => {
    const { dictionaries } = await import("@/lib/i18n/dictionaries");
    for (const t of Object.values(dictionaries)) {
      expect(t.billing.withdrawalConsent).toMatch(/14/);
      expect(t.billing.withdrawalCheckoutNotice.length).toBeLessThanOrEqual(1200);
      expect(t.errors.withdrawal_consent_required).toBeTruthy();
    }
  });
});
