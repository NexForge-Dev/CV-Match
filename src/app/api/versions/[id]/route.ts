import { NextResponse } from "next/server";
import { HttpError, assertUuid, withUser } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

/** Deletes one version, unless it is the only one left. */
export const DELETE = withUser<Ctx>(async (_req, { params }, { supabase }) => {
  const { id } = await params;
  assertUuid(id);
  const { data: version } = await supabase.from("resume_versions").select("id, resume_id").eq("id", id).maybeSingle();
  if (!version) throw new HttpError("not_found");
  const { count } = await supabase.from("resume_versions").select("id", { count: "exact", head: true }).eq("resume_id", version.resume_id);
  if ((count ?? 0) <= 1) throw new HttpError("conflict", "last_version");
  const { error } = await supabase.from("resume_versions").delete().eq("id", id);
  if (error) throw error;
  return NextResponse.json({ ok: true });
});
