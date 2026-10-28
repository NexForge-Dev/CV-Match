import { NextResponse } from "next/server";
import { z } from "zod";
import { HttpError, parseJson, withUser } from "@/lib/api";
import { env } from "@/lib/env";
import { parsePlans } from "@/lib/billing/plans";
import { getStripe } from "@/lib/billing/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const schema = z.object({ planId: z.string().min(1).max(64) });

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
    if (sub && ["active", "trialing", "past_due"].includes(sub.status)) throw new HttpError("conflict", "already_subscribed");
  }

  let { data: customer } = await admin.from("billing_customers").select("stripe_customer_id").eq("user_id", user.id).maybeSingle();
  if (!customer) {
    const created = await stripe.customers.create({ email: user.email ?? undefined, metadata: { user_id: user.id } });
    await admin.from("billing_customers").upsert({ user_id: user.id, stripe_customer_id: created.id }, { onConflict: "user_id", ignoreDuplicates: true });
    const { data: stored } = await admin.from("billing_customers").select("stripe_customer_id").eq("user_id", user.id).single();
    customer = stored;
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
          ...(plan.kind === "subscription" ? { recurring: { interval: plan.billing_interval ?? "month" } } : {}),
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
    success_url: `${appUrl}/billing?status=success`,
    cancel_url: `${appUrl}/billing?status=canceled`,
  });
  if (!session.url) throw new HttpError("server_error");
  return NextResponse.json({ url: session.url });
});
