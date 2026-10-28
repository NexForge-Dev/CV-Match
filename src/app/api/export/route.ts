import { z } from "zod";
import { HttpError, uuidLike, withUser } from "@/lib/api";
import { cvLanguageSchema } from "@/lib/cv/schema";
import { renderCvPdf } from "@/lib/export/pdf";
import { renderCvDocx } from "@/lib/export/docx";
import { TEMPLATES } from "@/lib/export/labels";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadVersion } from "@/lib/server/resumes";

export const runtime = "nodejs";

const querySchema = z.object({
  versionId: z.string().regex(uuidLike),
  format: z.enum(["pdf", "docx"]),
  template: z.enum(TEMPLATES).optional(),
  language: cvLanguageSchema.optional(),
});

function fileName(name: string, version: number, ext: string) {
  const base = name.normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "_") || "CV";
  return `${base}_v${version}.${ext}`;
}

/** Generates the file on the fly. Exports are not stored (only an audit row without content). */
export const GET = withUser(async (req, _ctx, { user, supabase }) => {
  const parsed = querySchema.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) throw new HttpError("invalid_input");
  const q = parsed.data;
  const version = await loadVersion(supabase, q.versionId);
  const template = q.template ?? version.resume.template;
  const language = q.language ?? version.resume.language;

  const bytes = q.format === "pdf" ? await renderCvPdf(version.cv, language, template) : await renderCvDocx(version.cv, language, template);
  await createAdminClient().from("exports").insert({ user_id: user.id, resume_version_id: version.id, format: q.format, template, language });

  const name = fileName(version.cv.contact.fullName || version.resume.title, version.versionNumber, q.format);
  return new Response(Buffer.from(bytes), {
    headers: {
      "content-type": q.format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "content-disposition": `attachment; filename="${name}"`,
      "cache-control": "private, no-store",
    },
  });
});
