import { NextResponse } from "next/server";
import { z } from "zod";
import { HttpError, parseJson, withUser } from "@/lib/api";
import { env } from "@/lib/env";
import { log } from "@/lib/log";
import { getStripe } from "@/lib/billing/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/** GET: export all of the user's data (data portability). */
export const GET = withUser(async (_req, _ctx, { user, supabase }) => {
  const tables = ["profiles", "profile_skills", "resumes", "resume_versions", "job_descriptions", "analyses", "suggestions", "analysis_extras", "documents", "exports", "credit_ledger", "subscriptions"] as const;
  const out: Record<string, unknown> = { exported_at: new Date().toISOString(), user: { id: user.id, email: user.email } };
  for (const table of tables) {
    const { data } = await supabase.from(table).select("*");
    out[table] = data ?? [];
  }
  return new NextResponse(JSON.stringify(out, null, 2), {
    headers: { "content-type": "application/json", "content-disposition": 'attachment; filename="cv-match-data.json"', "cache-control": "no-store" },
  });
});

const deleteSchema = z.object({ confirm: z.literal(true) });

/** DELETE: cancels billing, removes stored files and deletes the auth user (all rows cascade). */
export const DELETE = withUser(async (req, _ctx, { user, supabase }) => {
  await parseJson(req, deleteSchema);
  const admin = createAdminClient();

  const { data: sub } = await admin.from("subscriptions").select("stripe_subscription_id, status").eq("user_id", user.id).maybeSingle();
  if (sub?.stripe_subscription_id && !["canceled", "incomplete_expired"].includes(sub.status)) {
    if (!env().STRIPE_SECRET_KEY) throw new HttpError("not_configured", "stripe");
    await getStripe().subscriptions.cancel(sub.stripe_subscription_id);
  }

  const { data: files } = await admin.storage.from("cv-originals").list(user.id, { limit: 1000 });
  if (files?.length) await admin.storage.from("cv-originals").remove(files.map((f) => `${user.id}/${f.name}`));

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) throw error;
  await supabase.auth.signOut();
  log.info("account.deleted", { userId: user.id });
  return NextResponse.json({ ok: true });
});
