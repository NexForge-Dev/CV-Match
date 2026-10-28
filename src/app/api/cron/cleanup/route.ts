import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { log } from "@/lib/log";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * Retention job: deletes stored original files older than DOCUMENT_RETENTION_DAYS.
 * Call daily (e.g. Vercel Cron) with header `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(req: Request) {
  const secret = env().CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - env().DOCUMENT_RETENTION_DAYS * 86400_000).toISOString();
  const { data: docs, error } = await admin
    .from("documents")
    .select("id, storage_path")
    .not("storage_path", "is", null)
    .lt("created_at", cutoff)
    .limit(500);
  if (error) return NextResponse.json({ error: "query_failed" }, { status: 500 });

  let removed = 0;
  for (const doc of docs ?? []) {
    const { error: rmError } = await admin.storage.from("cv-originals").remove([doc.storage_path as string]);
    if (rmError) continue;
    await admin.from("documents").update({ storage_path: null, original_deleted_at: new Date().toISOString() }).eq("id", doc.id);
    removed++;
  }
  log.info("cron.cleanup", { removed });
  return NextResponse.json({ removed });
}
