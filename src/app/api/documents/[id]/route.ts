import { NextResponse } from "next/server";
import { HttpError, assertUuid, withUser } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";

type Ctx = { params: Promise<{ id: string }> };

/** DELETE ?scope=original removes only the stored file; scope=all removes the document and its extracted text. */
export const DELETE = withUser<Ctx>(async (req, { params }, { user, supabase }) => {
  const { id } = await params;
  assertUuid(id);
  const scope = new URL(req.url).searchParams.get("scope") === "original" ? "original" : "all";

  // Ownership check through RLS first; storage_path is server-managed (not user-writable).
  const { data: doc } = await supabase.from("documents").select("id, storage_path").eq("id", id).maybeSingle();
  if (!doc) throw new HttpError("not_found");
  const admin = createAdminClient();

  if (doc.storage_path) {
    if (!doc.storage_path.startsWith(`${user.id}/`)) throw new HttpError("forbidden");
    const { error } = await admin.storage.from("cv-originals").remove([doc.storage_path]);
    if (error) throw error;
  }

  if (scope === "original") {
    const { error } = await admin
      .from("documents")
      .update({ storage_path: null, original_deleted_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) throw error;
  } else {
    // Users cannot DELETE documents through the Data API (the stored file would be orphaned): the server does it.
    const { error } = await admin.from("documents").delete().eq("id", id).eq("user_id", user.id);
    if (error) throw error;
  }
  return NextResponse.json({ ok: true });
});
