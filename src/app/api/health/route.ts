import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isServerConfigValid, isSupabaseConfigured } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Liveness/readiness for uptime monitors. Public by design, so it reports only
 * booleans: no versions, keys, counts or user data. `config` is false when the
 * server env does not validate (routes using env() would fail with 500).
 */
export async function GET() {
  let database = false;
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
      const { error } = await supabase.from("plans").select("id", { head: true, count: "exact" }).limit(1);
      database = !error;
    } catch {
      database = false;
    }
  }
  const config = isServerConfigValid();
  const ok = database && config;
  return NextResponse.json({ ok, database, config }, { status: ok ? 200 : 503, headers: { "cache-control": "no-store" } });
}
