import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { log } from "@/lib/log";
import { getStripe } from "@/lib/billing/stripe";
import { handleStripeEvent } from "@/lib/billing/webhook";
import { supabaseBillingStore } from "@/lib/billing/supabaseStore";
import { createAdminClient } from "@/lib/supabase/admin";
import { billingAnalyticsEvents } from "@/lib/billing/analyticsEvents";
import { track } from "@/lib/analytics";

export const runtime = "nodejs";

/** Stripe webhook: signature-verified, idempotent. Configure the endpoint URL /api/stripe/webhook in Stripe. */
export async function POST(req: Request) {
  const secret = env().STRIPE_WEBHOOK_SECRET;
  if (!secret || !env().STRIPE_SECRET_KEY) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "missing_signature" }, { status: 400 });

  const stripe = getStripe();
  const payload = await req.text();
  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(payload, signature, secret);
  } catch {
    log.warn("stripe.webhook_invalid_signature");
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  try {
    const store = supabaseBillingStore(createAdminClient());
    const outcome = await handleStripeEvent(
      event,
      store,
      (id) => stripe.subscriptions.retrieve(id),
      (id) => stripe.paymentIntents.retrieve(id),
    );
    log.info("stripe.webhook", { type: event.type, eventId: event.id, outcome });
    if (outcome !== "duplicate") {
      // NexForge panel metrics; never blocks or fails the webhook.
      for (const ev of billingAnalyticsEvents(event)) {
        const userId = ev.userId ?? (ev.customerId ? await store.userIdForCustomer(ev.customerId).catch(() => undefined) : undefined);
        track(ev.event, userId, ev.properties, { once: event.id });
      }
    }
    return NextResponse.json({ received: true, outcome });
  } catch (err) {
    log.error("stripe.webhook_failed", { type: event.type, eventId: event.id, error: err instanceof Error ? err.message.slice(0, 80) : "unknown" });
    // 500 makes Stripe retry; handlers are idempotent.
    return NextResponse.json({ error: "processing_failed" }, { status: 500 });
  }
}
