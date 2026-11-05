import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { must } from "./must";

export interface CreditSummary {
  free_credits: number;
  paid_credits: number;
  plan_id: string | null;
  subscription_status: string | null;
  period_end: string | null;
  period_used: number | null;
  period_included: number | null;
}

export function hasActiveSubscription(c: CreditSummary) {
  return Boolean(c.plan_id && ["active", "trialing"].includes(c.subscription_status ?? "") && c.period_end && new Date(c.period_end) > new Date());
}

export function analysesAvailable(c: CreditSummary) {
  const sub = hasActiveSubscription(c) ? Math.max((c.period_included ?? 0) - (c.period_used ?? 0), 0) : 0;
  return sub + Math.max(c.paid_credits, 0) + Math.max(c.free_credits, 0);
}

export async function getCreditSummary(supabase: SupabaseClient): Promise<CreditSummary> {
  const { data } = must(await supabase.rpc("credit_summary"));
  const row = (data as CreditSummary[] | null)?.[0];
  return row ?? { free_credits: 0, paid_credits: 0, plan_id: null, subscription_status: null, period_end: null, period_used: null, period_included: null };
}
