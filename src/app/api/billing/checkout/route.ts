import { NextResponse } from "next/server";
import { z } from "zod";
import { HttpError, parseJson, withUser } from "@/lib/api";
import { env } from "@/lib/env";
import { parsePlans, stripeRecurring } from "@/lib/billing/plans";
import { getStripe } from "@/lib/billing/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { track } from "@/lib/analytics";

export const runtime = "nodejs";

const schema = z.object({ planId: z.string().min(1).max(64) });
const LIVE_STATUSES = ["active", "trialing", "past_due", "incomplete", "unpaid"];

/**
 * Creates a Stripe Checkout session. Price and benefits come from the `plans`
 * table (server-side), so changing a price needs no code change and the
 * browser cannot tamper with the amount.
 */
export const POST = withUser(async (req, _ctx, { user }) => {
  const { planId } = await parseJson(req, schema);
  const admin = createAdminClient();
  const { data: rows } = await admin.from("plans").select("*").eq("id", planId).eq("active", true);
  const plan = parsePlans(rows ?? [])[0];
  if (!plan || plan.kind === "free" || plan.price_cents <= 0) throw new HttpError("invalid_input", "plan");

  const stripe = getStripe();
  const appUrl = env().NEXT_PUBLIC_APP_URL;

  if (plan.kind === "subscription") {
    const { data: sub } = await admin.from("subscriptions").select("status").eq("user_id", user.id).maybeSingle();
    if (sub && LIVE_STATUSES.includes(sub.status)) throw new HttpError("conflict", "already_subscribed");
  }

  let { data: customer } = await admin.from("billing_customers").select("stripe_customer_id").eq("user_id", user.id).maybeSingle();
  if (!customer) {
    const created = await stripe.customers.create({ email: user.email ?? undefined, metadata: { user_id: user.id } });
    await admin.from("billing_customers").upsert({ user_id: user.id, stripe_customer_id: created.id }, { onConflict: "user_id", ignoreDuplicates: true });
    const { data: stored } = await admin.from("billing_customers").select("stripe_customer_id").eq("user_id", user.id).single();
    customer = stored;
  }

  // The subscriptions row is written by the webhook, so a checkout finished seconds ago (another tab)
  // may not be there yet: ask Stripe too, so nobody is billed for two subscriptions.
  if (plan.kind === "subscription") {
    const existing = await stripe.subscriptions.list({ customer: customer!.stripe_customer_id, status: "all", limit: 20 });
    if (existing.data.some((s) => LIVE_STATUSES.includes(s.status))) throw new HttpError("conflict", "already_subscribed");
  }

  const metadata = { user_id: user.id, plan_id: plan.id };
  const lineItem = plan.stripe_price_id
    ? { price: plan.stripe_price_id, quantity: 1 }
    : {
        quantity: 1,
        price_data: {
          currency: plan.currency,
          unit_amount: plan.price_cents,
          product_data: { name: `CV Match — ${plan.name}` },
          // Prices are VAT-inclusive consumer prices (same as the prices created by `npm run stripe:sync`).
          tax_behavior: "inclusive" as const,
          ...(plan.kind === "subscription" ? { recurring: stripeRecurring(plan.billing_interval) } : {}),
        },
      };

  const session = await stripe.checkout.sessions.create({
    mode: plan.kind === "subscription" ? "subscription" : "payment",
    customer: customer!.stripe_customer_id,
    client_reference_id: user.id,
    line_items: [lineItem],
    metadata,
    ...(plan.kind === "subscription" ? { subscription_data: { metadata } } : { payment_intent_data: { metadata } }),
    allow_promotion_codes: true,
    // Stripe Tax computes the VAT included in the price from the customer's address. Requires Stripe Tax
    // to be enabled with a registration in the dashboard; until then leave STRIPE_AUTOMATIC_TAX unset.
    ...(env().STRIPE_AUTOMATIC_TAX === "true"
      ? { automatic_tax: { enabled: true }, billing_address_collection: "required" as const, customer_update: { address: "auto" as const, name: "auto" as const } }
      : {}),
    success_url: `${appUrl}/billing?status=success`,
    cancel_url: `${appUrl}/billing?status=canceled`,
  });
  if (!session.url) throw new HttpError("server_error");
  const period = plan.kind === "pack" ? "one_off" : (plan.billing_interval ?? "month");
  track("plan_selected", user.id, { plan: plan.id, billing_period: period });
  track("checkout_started", user.id, { plan: plan.id, billing_period: period });
  return NextResponse.json({ url: session.url });
});
