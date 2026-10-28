import { NextResponse } from "next/server";
import { HttpError, assertUuid, withUser } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";

type Ctx = { params: Promise<{ id: string }> };

/** DELETE ?scope=original removes only the stored file; scope=all removes the document and its extracted text. */
export const DELETE = withUser<Ctx>(async (req, { params }, { user, supabase }) => {
  const { id } = await params;
  assertUuid(id);
  const scope = new URL(req.url).searchParams.get("scope") === "original" ? "original" : "all";

  const { data: doc } = await supabase.from("documents").select("id, storage_path").eq("id", id).maybeSingle();
  if (!doc) throw new HttpError("not_found");

  if (doc.storage_path) {
    if (!doc.storage_path.startsWith(`${user.id}/`)) throw new HttpError("forbidden");
    const { error } = await createAdminClient().storage.from("cv-originals").remove([doc.storage_path]);
    if (error) throw error;
  }

  if (scope === "original") {
    const { error } = await supabase.from("documents").update({ storage_path: null, original_deleted_at: new Date().toISOString() }).eq("id", id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("documents").delete().eq("id", id);
    if (error) throw error;
  }
  return NextResponse.json({ ok: true });
});
