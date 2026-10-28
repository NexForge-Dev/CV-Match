import { NextResponse } from "next/server";
import { assertUuid, withUser } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

export const DELETE = withUser<Ctx>(async (_req, { params }, { supabase }) => {
  const { id } = await params;
  assertUuid(id);
  const { error } = await supabase.from("profile_skills").delete().eq("id", id);
  if (error) throw error;
  return NextResponse.json({ ok: true });
});
