import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { UnknownUserError, type BillingStore } from "./webhook";

/** 23503 = foreign key violation: the user row is gone (account deleted). */
function check(error: { code?: string } | null) {
  if (!error) return;
  if (error.code === "23503") throw new UnknownUserError();
  throw error;
}

export function supabaseBillingStore(admin: SupabaseClient): BillingStore {
  return {
    async isProcessed(eventId) {
      const { data } = await admin.from("stripe_events").select("id").eq("id", eventId).maybeSingle();
      return Boolean(data);
    },
    async markProcessed(eventId, type) {
      const { error } = await admin.from("stripe_events").upsert({ id: eventId, type }, { onConflict: "id", ignoreDuplicates: true });
      if (error) throw error;
    },
    async getPlan(planId) {
      const { data } = await admin.from("plans").select("id, kind, analyses_included").eq("id", planId).maybeSingle();
      return data as { id: string; kind: "free" | "pack" | "subscription"; analyses_included: number } | null;
    },
    async addPaidCredits(userId, amount, ref) {
      const { error } = await admin
        .from("credit_ledger")
        .upsert({ user_id: userId, delta: amount, credit_type: "paid", reason: "pack_purchase", external_ref: ref }, { onConflict: "external_ref", ignoreDuplicates: true });
      check(error);
    },
    async paidBalance(userId) {
      const { data, error } = await admin.from("credit_ledger").select("delta").eq("user_id", userId).eq("credit_type", "paid");
      if (error) throw error;
      return (data ?? []).reduce((sum, row) => sum + (row.delta as number), 0);
    },
    async revokePaidCredits(userId, amount, ref) {
      const { error } = await admin
        .from("credit_ledger")
        .upsert({ user_id: userId, delta: -amount, credit_type: "paid", reason: "refund", external_ref: ref }, { onConflict: "external_ref", ignoreDuplicates: true });
      check(error);
    },
    async revokedFor(userId, key) {
      // Few rows per user: filter in code instead of escaping the ref inside a PostgREST filter.
      const { data, error } = await admin.from("credit_ledger").select("delta, external_ref").eq("user_id", userId).eq("credit_type", "paid").eq("reason", "refund");
      if (error) throw error;
      return (data ?? [])
        .filter((row) => row.external_ref === key || String(row.external_ref ?? "").startsWith(`${key}:`))
        .reduce((sum, row) => sum - (row.delta as number), 0);
    },
    async upsertSubscription(s) {
      const { error } = await admin.from("subscriptions").upsert(
        {
          user_id: s.userId,
          plan_id: s.planId,
          status: s.status,
          stripe_subscription_id: s.stripeSubscriptionId,
          current_period_start: s.currentPeriodStart,
          current_period_end: s.currentPeriodEnd,
          cancel_at_period_end: s.cancelAtPeriodEnd,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
      check(error);
    },
    async getSubscription(userId) {
      const { data } = await admin.from("subscriptions").select("stripe_subscription_id, status").eq("user_id", userId).maybeSingle();
      return data ? { stripeSubscriptionId: (data.stripe_subscription_id as string | null) ?? null, status: data.status as string } : null;
    },
    async userIdForCustomer(customerId) {
      const { data } = await admin.from("billing_customers").select("user_id").eq("stripe_customer_id", customerId).maybeSingle();
      return (data?.user_id as string | undefined) ?? null;
    },
  };
}
