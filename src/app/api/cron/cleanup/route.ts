import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { log } from "@/lib/log";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function authorized(header: string | null, secret: string | undefined) {
  if (!secret || !header) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Retention job: deletes stored original files older than DOCUMENT_RETENTION_DAYS, and gives back
 * credits of analyses that were cut off (function timeout) before storing a result or refunding.
 * Call daily (e.g. Vercel Cron) with header `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(req: Request) {
  if (!authorized(req.headers.get("authorization"), env().CRON_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();
  const { data: reconciled, error: reconcileError } = await admin.rpc("reconcile_orphan_analyses");
  if (reconcileError) log.warn("cron.reconcile_failed", {});

  const cutoff = new Date(Date.now() - env().DOCUMENT_RETENTION_DAYS * 86400_000).toISOString();
  const { data: docs, error } = await admin
    .from("documents")
    .select("id, user_id, storage_path")
    .not("storage_path", "is", null)
    .lt("created_at", cutoff)
    .limit(500);
  if (error) return NextResponse.json({ error: "query_failed" }, { status: 500 });

  let removed = 0;
  let skipped = 0;
  for (const doc of docs ?? []) {
    const path = doc.storage_path as string;
    // Defence in depth: only ever delete inside the owner's own folder.
    if (!path.startsWith(`${doc.user_id}/`) || path.includes("..")) {
      skipped++;
      continue;
    }
    const { error: rmError } = await admin.storage.from("cv-originals").remove([path]);
    if (rmError) continue;
    await admin.from("documents").update({ storage_path: null, original_deleted_at: new Date().toISOString() }).eq("id", doc.id);
    removed++;
  }
  log.info("cron.cleanup", { removed, skipped, reconciled: reconciled ?? 0 });
  return NextResponse.json({ removed, reconciled: reconciled ?? 0 });
}
