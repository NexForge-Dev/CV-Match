import { describe, expect, it } from "vitest";
import { parseCvText } from "@/lib/cv/parse";
import type Stripe from "stripe";
import { handleStripeEvent, UnknownUserError, type BillingStore } from "@/lib/billing/webhook";
import { FALLBACK_PLANS } from "@/lib/billing/plans";

describe("CV parsing never rejects a real CV because of its size", () => {
  it("long experiences, long lines and many items are clamped to the schema limits", () => {
    const bullets = Array.from({ length: 45 }, (_, i) => `• Did task number ${i} with care`).join("\n");
    const longCert = `Certificação ${"muito ".repeat(80)}longa`;
    const text = `Ana Souza\nDev\n\nExperiência\nDev - Acme\n2020 - 2021\n${bullets}\n\nCertificações\n${longCert}\n\nProjetos\n${"Projeto X - " + "descrição ".repeat(600)}`;
    const cv = parseCvText(text);
    expect(cv.experiences[0].bullets.length).toBeLessThanOrEqual(30);
    expect(cv.certifications[0].length).toBeLessThanOrEqual(300);
    expect(cv.projects[0].description.length).toBeLessThanOrEqual(4000);
  });
});


function ledgerStore(opts: { unknownUser?: boolean } = {}) {
  const ledger = new Map<string, number>();
  const processed = new Set<string>();
  const store: BillingStore = {
    isProcessed: async (id) => processed.has(id),
    markProcessed: async (id) => void processed.add(id),
    async getPlan(id) {
      const p = FALLBACK_PLANS.find((x) => x.id === id);
      return p ? { id: p.id, kind: p.kind, analyses_included: p.analyses_included } : null;
    },
    async addPaidCredits(_u, amount, ref) {
      if (opts.unknownUser) throw new UnknownUserError();
      if (!ledger.has(ref)) ledger.set(ref, amount);
    },
    paidBalance: async () => [...ledger.values()].reduce((s, n) => s + n, 0),
    async revokePaidCredits(_u, amount, ref) {
      if (!ledger.has(ref)) ledger.set(ref, -amount);
    },
    revokedFor: async (_u, key) => [...ledger.entries()].filter(([r]) => r === key || r.startsWith(`${key}:`)).reduce((s, [, n]) => s - n, 0),
    async upsertSubscription() {
      if (opts.unknownUser) throw new UnknownUserError();
    },
    userIdForCustomer: async () => null,
    getSubscription: async () => null,
  };
  return { store, ledger, processed };
}
const ev = (id: string, type: string, object: unknown) => ({ id, type, data: { object } }) as unknown as Stripe.Event;
const meta = { user_id: "user-1", plan_id: "pack_10" };
const fetchPi = async () => ({ amount: 1990, amount_received: 1990, metadata: meta }) as unknown as Stripe.PaymentIntent;
const never = async () => {
  throw new Error("no fetch");
};

describe("stripe webhook: refunds, disputes and deleted accounts", () => {
  it("successive partial refunds of one charge revoke the cumulative share, never twice", async () => {
    const { store, ledger } = ledgerStore();
    ledger.set("cs_1", 10);
    const charge = (refunded: number) => ({ id: "ch_9", amount: 1990, amount_refunded: refunded, metadata: meta });
    expect(await handleStripeEvent(ev("e1", "charge.refunded", charge(995)), store, never)).toBe("credits_revoked");
    expect(await store.paidBalance("user-1")).toBe(5);
    expect(await handleStripeEvent(ev("e2", "charge.refunded", charge(1990)), store, never)).toBe("credits_revoked");
    expect(await store.paidBalance("user-1")).toBe(0);
    expect(await handleStripeEvent(ev("e3", "charge.refunded", charge(1990)), store, never)).toBe("refund_nothing_to_revoke");
  });

  it("a legacy refund ref (refund:<charge>) counts as already revoked", async () => {
    const { store, ledger } = ledgerStore();
    ledger.set("cs_1", 10);
    ledger.set("refund:ch_8", -5);
    expect(await handleStripeEvent(ev("e4", "charge.refunded", { id: "ch_8", amount: 1990, amount_refunded: 995, metadata: meta }), store, never)).toBe("refund_nothing_to_revoke");
    expect(await store.paidBalance("user-1")).toBe(5);
  });

  it("a chargeback on a pack revokes its credits once", async () => {
    const { store, ledger } = ledgerStore();
    ledger.set("cs_1", 10);
    const dispute = { id: "dp_1", amount: 1990, payment_intent: "pi_1" };
    expect(await handleStripeEvent(ev("e5", "charge.dispute.created", dispute), store, never, fetchPi)).toBe("credits_revoked");
    expect(await handleStripeEvent(ev("e6", "charge.dispute.created", dispute), store, never, fetchPi)).toBe("refund_nothing_to_revoke");
    expect(await store.paidBalance("user-1")).toBe(0);
  });

  it("events for a deleted account are recorded and ignored instead of failing forever", async () => {
    const { store, processed } = ledgerStore({ unknownUser: true });
    const session = { id: "cs_x", mode: "payment", payment_status: "paid", metadata: meta };
    expect(await handleStripeEvent(ev("e7", "checkout.session.completed", session), store, never)).toBe("ignored_unknown_user");
    expect(processed.has("e7")).toBe(true);
  });
});

describe("auth errors are shown translated, never as raw Supabase English", async () => {
  const { authErrorMessage } = await import("@/lib/authErrors");
  const { dictionaries } = await import("@/lib/i18n/dictionaries");
  const t = dictionaries.pt;
  it("maps the common signup and password errors", () => {
    expect(authErrorMessage(t, { code: "user_already_exists", message: "User already registered" })).toBe(t.auth.alreadyRegistered);
    expect(authErrorMessage(t, { code: "weak_password", message: "Password should be at least 8 characters" })).toBe(t.auth.weakPassword);
    expect(authErrorMessage(t, { code: "over_email_send_rate_limit", message: "email rate limit exceeded" })).toBe(t.auth.tooManyAttempts);
    expect(authErrorMessage(t, { message: "captcha protection: request disallowed" })).toBe(t.auth.captchaFailed);
    expect(authErrorMessage(t, { message: "Database error saving new user" })).toBe(t.errors.generic);
  });
});

describe("jobs without a title get one from the ad", async () => {
  const { titleFromAd } = await import("@/lib/analysis/jobTitle");
  it("uses the first non-empty line, without bullets, shortened", () => {
    expect(titleFromAd("\n\n# Desenvolvedora Front-end Pleno\nRequisitos...")).toBe("Desenvolvedora Front-end Pleno");
    expect(titleFromAd("x".repeat(300)).length).toBeLessThanOrEqual(120);
  });
});

describe("server env treats empty variables as unset", async () => {
  const { env, resetEnvCache } = await import("@/lib/env");
  it("empty optional URL and enum settings do not break the configuration", () => {
    const saved = { ...process.env };
    Object.assign(process.env, { NEXFORGE_ENDPOINT: "", STRIPE_AUTOMATIC_TAX: "", OCR_HTTP_URL: "", STORE_ORIGINAL_FILES: "" });
    resetEnvCache();
    try {
      expect(env().STRIPE_AUTOMATIC_TAX).toBe("false");
      expect(env().NEXFORGE_ENDPOINT).toBeUndefined();
    } finally {
      for (const k of ["NEXFORGE_ENDPOINT", "STRIPE_AUTOMATIC_TAX", "OCR_HTTP_URL", "STORE_ORIGINAL_FILES"]) {
        if (saved[k] === undefined) delete process.env[k];
        else process.env[k] = saved[k];
      }
      resetEnvCache();
    }
  });
});
