import { NextResponse } from "next/server";
import { z } from "zod";
import { HttpError, parseJson, withUser } from "@/lib/api";
import { env } from "@/lib/env";
import { log } from "@/lib/log";
import { getStripe } from "@/lib/billing/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { analytics, track } from "@/lib/analytics";
import { cancelForDeletion } from "@/lib/billing/cancel";

export const runtime = "nodejs";

const EXPORT_TABLES = [
  "profiles", "profile_skills", "resumes", "resume_versions", "job_descriptions", "analyses", "suggestions", "analysis_extras",
  "documents", "exports", "credit_ledger", "subscriptions", "billing_customers", "usage_events",
] as const;
const PAGE = 1000;

async function readAll(fetchPage: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: unknown }>) {
  const rows: unknown[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await fetchPage(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) return rows;
  }
}

/** GET: export all of the user's data (data portability, LGPD art. 18 V). RLS limits every table to the user's own rows. */
export const GET = withUser(async (_req, _ctx, { user, supabase }) => {
  const out: Record<string, unknown> = { exported_at: new Date().toISOString(), user: { id: user.id, email: user.email, created_at: user.created_at, terms_accepted_at: user.user_metadata?.terms_accepted_at ?? null, terms_version: user.user_metadata?.terms_version ?? null } };
  for (const table of EXPORT_TABLES) {
    // The Data API returns at most 1000 rows per request: page through every table.
    out[table] = await readAll((from, to) => supabase.from(table).select("*").order(table === "subscriptions" || table === "billing_customers" ? "user_id" : "id").range(from, to));
  }
  // Server-only table: RLS would hide it from the user's client, so it is read as the service role, scoped to this user.
  const admin = createAdminClient();
  out.product_feedback = await readAll((from, to) => admin.from("product_feedback").select("id, kind, message, page, status, created_at").eq("user_id", user.id).order("id").range(from, to));
  analytics.feature(user.id, "exportacao_dados");
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
    await cancelForDeletion(getStripe(), sub.stripe_subscription_id);
  }

  // LGPD: the Stripe customer holds the e-mail address. Deleting it removes that personal data from
  // Stripe (charges and invoices, the fiscal records, stay in Stripe and can still be refunded).
  const { data: customer } = await admin.from("billing_customers").select("stripe_customer_id").eq("user_id", user.id).maybeSingle();
  if (customer?.stripe_customer_id && env().STRIPE_SECRET_KEY) {
    try {
      await getStripe().customers.del(customer.stripe_customer_id);
    } catch (err) {
      // Already gone or created in the other mode: never block the account deletion on it.
      log.warn("account.stripe_customer_delete_failed", { reason: (err as { code?: string }).code ?? "unknown" });
    }
  }

  const { data: files } = await admin.storage.from("cv-originals").list(user.id, { limit: 1000 });
  if (files?.length) await admin.storage.from("cv-originals").remove(files.map((f) => `${user.id}/${f.name}`));

  // Queued before the user disappears; sent after the response.
  track("account_deleted", user.id);
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) throw error;
  await supabase.auth.signOut();
  log.info("account.deleted", { userId: user.id });
  return NextResponse.json({ ok: true });
});
