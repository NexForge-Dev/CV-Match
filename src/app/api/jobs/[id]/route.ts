import { NextResponse } from "next/server";
import { z } from "zod";
import { HttpError, assertUuid, parseJson, withUser } from "@/lib/api";
import { requirementSchema } from "@/lib/analysis/requirements";

type Ctx = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  saved: z.boolean().optional(),
  title: z.string().trim().max(200).optional(),
  company: z.string().trim().max(200).optional(),
  requirements: z.array(requirementSchema).max(60).optional(),
});

export const PATCH = withUser<Ctx>(async (req, { params }, { supabase }) => {
  const { id } = await params;
  assertUuid(id);
  const body = await parseJson(req, patchSchema);
  const { data, error } = await supabase.from("job_descriptions").update(body).eq("id", id).select("id").maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError("not_found");
  return NextResponse.json({ ok: true });
});

export const DELETE = withUser<Ctx>(async (_req, { params }, { supabase }) => {
  const { id } = await params;
  assertUuid(id);
  const { error } = await supabase.from("job_descriptions").delete().eq("id", id);
  if (error) throw error;
  return NextResponse.json({ ok: true });
});
