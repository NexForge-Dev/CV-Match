import type Stripe from "stripe";
import { log } from "@/lib/log";

/**
 * Cancels the subscription of an account being deleted. A subscription Stripe does not know (already removed,
 * or created with the other mode's keys) has nothing left to cancel and must not block a deletion request.
 */
export async function cancelForDeletion(stripe: Pick<Stripe, "subscriptions">, subscriptionId: string) {
  try {
    await stripe.subscriptions.cancel(subscriptionId);
  } catch (err) {
    if ((err as { code?: string }).code !== "resource_missing") throw err;
    log.warn("account.stripe_subscription_missing");
  }
}
