import { NextResponse } from "next/server";
import { HttpError, withUser } from "@/lib/api";
import { env } from "@/lib/env";
import { getStripe } from "@/lib/billing/stripe";

export const runtime = "nodejs";

/** Opens the Stripe customer portal (cancel, change card, invoices). */
export const POST = withUser(async (_req, _ctx, { supabase }) => {
  const { data: customer } = await supabase.from("billing_customers").select("stripe_customer_id").maybeSingle();
  if (!customer) throw new HttpError("not_found");
  try {
    const session = await getStripe().billingPortal.sessions.create({
      customer: customer.stripe_customer_id,
      return_url: `${env().NEXT_PUBLIC_APP_URL}/billing`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    // Customer deleted in Stripe or created with the other mode's keys: nothing to manage.
    if ((err as { code?: string }).code === "resource_missing") throw new HttpError("not_found");
    throw err;
  }
});
