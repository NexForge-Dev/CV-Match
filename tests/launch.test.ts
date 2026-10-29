import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import type Stripe from "stripe";
import { safeNextPath } from "@/lib/safeNext";
import { inflatesWithin, inspectZip, validateUpload } from "@/lib/documents/validate";
import { handleStripeEvent, type BillingStore } from "@/lib/billing/webhook";
import { FALLBACK_PLANS } from "@/lib/billing/plans";

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

describe("post-login redirects stay on this site", () => {
  it("keeps same-origin paths", () => {
    expect(safeNextPath("/billing?status=x", "/dashboard")).toBe("/billing?status=x");
    expect(safeNextPath("/analyses/123", "/dashboard")).toBe("/analyses/123");
  });

  it("rejects external, protocol-relative, backslash and control-character targets", () => {
    for (const next of ["https://evil.com", "//evil.com", "/\\evil.com", "/\\/evil.com", "/\tevil", "/\nevil", "evil.com", "", null, undefined]) {
      expect(safeNextPath(next, "/dashboard")).toBe("/dashboard");
    }
  });
});

describe("DOCX archives whose headers lie about their size", () => {
  async function bomb() {
    const zip = new JSZip();
    zip.file("word/document.xml", "<w:document/>");
    zip.file("word/bomb.xml", "0".repeat(70 * 1024 * 1024));
    const bytes = new Uint8Array(await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" }));
    // Rewrite every declared uncompressed size in the central directory to 10 bytes.
    const view = new DataView(bytes.buffer);
    for (let i = 0; i + 4 <= bytes.length; i++) if (view.getUint32(i, true) === 0x02014b50) view.setUint32(i + 24, 10, true);
    return bytes;
  }

  it("passes the declared-size check but is rejected once inflated with a cap", async () => {
    const bytes = await bomb();
    expect(inspectZip(bytes)?.uncompressedBytes).toBeLessThan(100);
    expect(inflatesWithin(bytes, 60 * 1024 * 1024)).toBe(false);
    expect(validateUpload(bytes, "cv.docx", DOCX_MIME, 5_000_000)).toEqual({ ok: false, code: "unsafe_archive" });
  });

  it("a normal DOCX inflates within the limit", async () => {
    const zip = new JSZip();
    zip.file("[Content_Types].xml", "<Types/>");
    zip.file("word/document.xml", `<w:document>${"text ".repeat(5000)}</w:document>`);
    const bytes = new Uint8Array(await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" }));
    expect(inflatesWithin(bytes, 60 * 1024 * 1024)).toBe(true);
    expect(validateUpload(bytes, "cv.docx", DOCX_MIME, 5_000_000)).toMatchObject({ ok: true });
  });
});

function memoryStore() {
  const ledger = new Map<string, number>();
  const subs = new Map<string, string>();
  const store: BillingStore = {
    isProcessed: async () => false,
    markProcessed: async () => {},
    async getPlan(id) {
      const p = FALLBACK_PLANS.find((x) => x.id === id);
      return p ? { id: p.id, kind: p.kind, analyses_included: p.analyses_included } : null;
    },
    async addPaidCredits(_userId, amount, ref) {
      ledger.set(ref, amount);
    },
    async upsertSubscription(s) {
      subs.set(s.userId, s.planId);
    },
    userIdForCustomer: async () => "user-1",
    getSubscription: async () => null,
  };
  return { store, ledger, subs };
}

const event = (id: string, type: string, object: unknown) => ({ id, type, data: { object } }) as unknown as Stripe.Event;

describe("stripe webhook: launch fixes", () => {
  it("a pack bought with a 100% promotion code is still granted", async () => {
    const { store, ledger } = memoryStore();
    const session = { id: "cs_free", mode: "payment", payment_status: "no_payment_required", metadata: { user_id: "user-1", plan_id: "pack_10" } };
    expect(await handleStripeEvent(event("evt_promo", "checkout.session.completed", session), store, async () => ({}) as Stripe.Subscription)).toBe("credits_added");
    expect(ledger.get("cs_free")).toBe(10);
  });

  it("a plan switch in the customer portal follows the price, not the checkout metadata", async () => {
    const { store, subs } = memoryStore();
    const switched = {
      id: "sub_1",
      customer: "cus_1",
      status: "active",
      cancel_at_period_end: false,
      metadata: { user_id: "user-1", plan_id: "pro_quarterly" },
      items: { data: [{ current_period_start: 1, current_period_end: 2, price: { lookup_key: "cvmatch_pro_monthly" } }] },
    } as unknown as Stripe.Subscription;
    await handleStripeEvent(event("evt_switch", "customer.subscription.updated", switched), store, async () => switched);
    expect(subs.get("user-1")).toBe("pro_monthly");
  });

  it("prices without a CV Match lookup key fall back to the checkout metadata", async () => {
    const { store, subs } = memoryStore();
    const sub = {
      id: "sub_2",
      customer: "cus_1",
      status: "active",
      cancel_at_period_end: false,
      metadata: { user_id: "user-1", plan_id: "pro_quarterly" },
      items: { data: [{ current_period_start: 1, current_period_end: 2, price: { lookup_key: null } }] },
    } as unknown as Stripe.Subscription;
    await handleStripeEvent(event("evt_meta", "customer.subscription.updated", sub), store, async () => sub);
    expect(subs.get("user-1")).toBe("pro_quarterly");
  });
});
