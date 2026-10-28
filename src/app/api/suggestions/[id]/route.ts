import { NextResponse } from "next/server";
import { z } from "zod";
import { HttpError, assertUuid, parseJson, withUser } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({
  status: z.enum(["pending", "accepted", "rejected"]).optional(),
  editedText: z.string().max(6000).nullable().optional(),
  confirmedByUser: z.boolean().optional(),
});

/** Users can change only the decision fields of their own suggestions (column grants + RLS). */
export const PATCH = withUser<Ctx>(async (req, { params }, { supabase }) => {
  const { id } = await params;
  assertUuid(id);
  const body = await parseJson(req, schema);
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.status !== undefined) update.status = body.status;
  if (body.editedText !== undefined) update.edited_text = body.editedText;
  if (body.confirmedByUser !== undefined) update.confirmed_by_user = body.confirmedByUser;
  const { data, error } = await supabase.from("suggestions").update(update).eq("id", id).select("id").maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError("not_found");
  return NextResponse.json({ ok: true });
});
