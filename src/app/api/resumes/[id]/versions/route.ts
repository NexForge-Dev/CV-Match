import { NextResponse } from "next/server";
import { z } from "zod";
import { HttpError, assertUuid, parseJson, withUser } from "@/lib/api";
import { cvDataSchema } from "@/lib/cv/schema";
import { insertVersion } from "@/lib/server/resumes";
import { analytics } from "@/lib/analytics";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({ cv: cvDataSchema, label: z.string().trim().max(200).default("") });

/** Saves edits as a NEW version; existing versions are never modified. */
export const POST = withUser<Ctx>(async (req, { params }, { user, supabase }) => {
  const { id } = await params;
  assertUuid(id);
  const body = await parseJson(req, schema);
  const { data: resume } = await supabase.from("resumes").select("id").eq("id", id).maybeSingle();
  if (!resume) throw new HttpError("not_found");
  const version = await insertVersion(supabase, { resumeId: id, userId: user.id, data: body.cv, origin: "manual", label: body.label });
  analytics.feature(user.id, "versao_criada");
  return NextResponse.json({ versionId: version.id, versionNumber: version.version_number });
});
