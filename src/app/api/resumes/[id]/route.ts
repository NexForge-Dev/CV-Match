import { NextResponse } from "next/server";
import { z } from "zod";
import { HttpError, assertUuid, parseJson, withUser } from "@/lib/api";
import { cvLanguageSchema } from "@/lib/cv/schema";

type Ctx = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  language: cvLanguageSchema.optional(),
  template: z.enum(["classic", "modern"]).optional(),
});

export const PATCH = withUser<Ctx>(async (req, { params }, { supabase }) => {
  const { id } = await params;
  assertUuid(id);
  const body = await parseJson(req, patchSchema);
  const { data, error } = await supabase.from("resumes").update(body).eq("id", id).select("id").maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError("not_found");
  return NextResponse.json({ ok: true });
});

export const DELETE = withUser<Ctx>(async (_req, { params }, { supabase }) => {
  const { id } = await params;
  assertUuid(id);
  const { data, error } = await supabase.from("resumes").delete().eq("id", id).select("id");
  if (error) throw error;
  if (!data.length) throw new HttpError("not_found");
  return NextResponse.json({ ok: true });
});
