import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));
vi.mock("@/lib/auth", () => ({ getApiUser: async () => ({ user: { id: "user-1", email: "a@test.dev" }, supabase: {} }) }));
vi.mock("@/lib/analytics", () => ({ track: () => {} }));
vi.mock("@/lib/i18n/server", async () => {
  const { dictionaries } = await import("@/lib/i18n/dictionaries");
  return { getDictionary: async () => ({ locale: "pt", t: dictionaries.pt }) };
});

const PLAN = { id: "pack_10", name: "Pacote 10 análises", kind: "pack", price_cents: 1990, currency: "brl", billing_interval: null, analyses_included: 10, features: {}, stripe_price_id: "price_1", active: true, sort: 1 };
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

const createSession = vi.fn<(params: Record<string, unknown>) => Promise<{ url: string }>>(async () => ({ url: "https://checkout.stripe.com/c/pay/cs_test_1" }));
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

describe("checkout requires accepting the Terms and the 7-day refund policy", () => {
  it("rejects a checkout without the consent flag before touching the database or Stripe", async () => {
    for (const body of [{ planId: "pack_10" }, { planId: "pack_10", termsAccepted: false }, { planId: "pack_10", termsAccepted: "true" }]) {
      expect(await checkout(body)).toEqual({ status: 400, body: { error: "invalid_input", detail: "terms_consent_required" } });
    }
    expect(adminFrom).not.toHaveBeenCalled();
    expect(createSession).not.toHaveBeenCalled();
  });

  it("records the acceptance in the Stripe session and restates the refund policy at checkout", async () => {
    const res = await checkout({ planId: "pack_10", termsAccepted: true });
    expect(res).toEqual({ status: 200, body: { url: "https://checkout.stripe.com/c/pay/cs_test_1" } });
    const params = createSession.mock.calls[0][0] as {
      metadata: Record<string, string>;
      payment_intent_data: { metadata: Record<string, string> };
      custom_text: { submit: { message: string } };
    };
    expect(params.metadata).toMatchObject({ user_id: "user-1", plan_id: "pack_10", terms_accepted: "true" });
    expect(params.metadata.terms_accepted_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(params.metadata.terms_version).toBeTruthy();
    expect(params.metadata).not.toHaveProperty("withdrawal_waiver");
    expect(params.payment_intent_data.metadata).toMatchObject({ terms_accepted: "true" });
    // Restated in the buyer's language (pt-BR here), within Stripe's 1200-character limit.
    expect(params.custom_text.submit.message).toMatch(/7 dias/);
    expect(params.custom_text.submit.message.length).toBeLessThanOrEqual(1200);
  });
});

describe("refund policy wording", () => {
  it("exists in every language, states the 7-day window and never asks to waive it", async () => {
    const { dictionaries } = await import("@/lib/i18n/dictionaries");
    for (const t of Object.values(dictionaries)) {
      expect(t.billing.termsConsent).toMatch(/7/);
      expect(t.billing.termsConsent).not.toMatch(/14/);
      expect(t.billing.termsCheckoutNotice.length).toBeLessThanOrEqual(1200);
      expect(t.errors.terms_consent_required).toBeTruthy();
    }
  });
});
