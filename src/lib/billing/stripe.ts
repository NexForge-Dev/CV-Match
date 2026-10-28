import "server-only";
import Stripe from "stripe";
import { env } from "@/lib/env";
import { HttpError } from "@/lib/api";

let client: Stripe | null = null;

export function getStripe(): Stripe {
  const key = env().STRIPE_SECRET_KEY;
  if (!key) throw new HttpError("not_configured", "stripe");
  if (!client) client = new Stripe(key, { appInfo: { name: "CV Match" } });
  return client;
}

export function isStripeTestMode(): boolean {
  return (env().STRIPE_SECRET_KEY ?? "").startsWith("sk_test_");
}
