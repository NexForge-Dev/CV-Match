import "server-only";
import { createClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/env";
import { log } from "@/lib/log";
import { FALLBACK_PLANS, parsePlans, type Plan } from "./plans";

/** Active plans from the database (public read via RLS), with a display fallback. */
export async function getPublicPlans(): Promise<Plan[]> {
  if (!isSupabaseConfigured()) return FALLBACK_PLANS;
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
    const { data, error } = await supabase.from("plans").select("*").eq("active", true).order("sort");
    if (error || !data?.length) return FALLBACK_PLANS;
    return parsePlans(data);
  } catch (err) {
    log.warn("plans.fetch_failed", { error: err instanceof Error ? err.message.slice(0, 60) : "unknown" });
    return FALLBACK_PLANS;
  }
}
