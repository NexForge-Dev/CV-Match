import { NextResponse } from "next/server";
import { HttpError, assertUuid, withUser } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

/** Deletes one analysis with its suggestions and extras (cascade). */
export const DELETE = withUser<Ctx>(async (_req, { params }, { supabase }) => {
  const { id } = await params;
  assertUuid(id);
  const { data, error } = await supabase.from("analyses").delete().eq("id", id).select("id");
  if (error) throw error;
  if (!data.length) throw new HttpError("not_found");
  return NextResponse.json({ ok: true });
});
