import { NextResponse } from "next/server";
import { z } from "zod";
import { HttpError, parseJson, uuidLike, withUser } from "@/lib/api";
import { cvDataSchema, cvLanguageSchema } from "@/lib/cv/schema";
import { insertVersion } from "@/lib/server/resumes";
import { analytics } from "@/lib/analytics";

const schema = z.object({
  title: z.string().trim().min(1).max(200),
  language: cvLanguageSchema,
  template: z.enum(["classic", "modern"]).default("modern"),
  documentId: z.string().regex(uuidLike).nullable().optional(),
  cv: cvDataSchema,
});

/** Creates a CV and its original version (v1) from user-reviewed data. */
export const POST = withUser(async (req, _ctx, { user, supabase }) => {
  const body = await parseJson(req, schema);
  const { data: resume, error } = await supabase
    .from("resumes")
    .insert({ user_id: user.id, title: body.title, language: body.language, template: body.template, source_document_id: body.documentId ?? null })
    .select("id")
    .single();
  if (error) throw error.code === "42501" ? new HttpError("forbidden") : error;
  const version = await insertVersion(supabase, { resumeId: resume.id, userId: user.id, data: body.cv, origin: "import" });
  analytics.step(user.id, "cv_revisado");
  return NextResponse.json({ resumeId: resume.id, versionId: version.id });
});
