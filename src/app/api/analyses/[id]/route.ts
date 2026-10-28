import { NextResponse } from "next/server";
import { assertUuid, withUser } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

/** Deletes one analysis with its suggestions and extras (cascade). */
export const DELETE = withUser<Ctx>(async (_req, { params }, { supabase }) => {
  const { id } = await params;
  assertUuid(id);
  const { error } = await supabase.from("analyses").delete().eq("id", id);
  if (error) throw error;
  return NextResponse.json({ ok: true });
});
