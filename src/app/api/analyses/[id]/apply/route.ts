import { NextResponse } from "next/server";
import { z } from "zod";
import { HttpError, assertUuid, withUser } from "@/lib/api";
import { ApplyError, SUGGESTION_KINDS, applySuggestions, type AppliedSuggestion } from "@/lib/analysis/suggestions";
import { insertVersion, loadVersion } from "@/lib/server/resumes";
import { cvDataSchema } from "@/lib/cv/schema";
import { analytics } from "@/lib/analytics";

type Ctx = { params: Promise<{ id: string }> };

const rowSchema = z.object({
  kind: z.enum(SUGGESTION_KINDS),
  target_ref: z.any(),
  suggested_text: z.string(),
  edited_text: z.string().nullable(),
  flags: z.array(z.string()).default([]),
  confirmed_by_user: z.boolean(),
});

/** Applies accepted suggestions to the analyzed version and saves the result as a NEW version. */
export const POST = withUser<Ctx>(async (_req, { params }, { user, supabase }) => {
  const { id } = await params;
  assertUuid(id);
  const { data: analysis } = await supabase.from("analyses").select("id, resume_version_id").eq("id", id).maybeSingle();
  if (!analysis) throw new HttpError("not_found");

  const { data: rows, error } = await supabase
    .from("suggestions")
    .select("kind, target_ref, suggested_text, edited_text, flags, confirmed_by_user")
    .eq("analysis_id", id)
    .eq("status", "accepted")
    .order("position");
  if (error) throw error;
  if (!rows?.length) throw new HttpError("invalid_input", "no_accepted_suggestions");

  const accepted: AppliedSuggestion[] = rows.map((r) => {
    const row = rowSchema.parse(r);
    return {
      kind: row.kind,
      targetRef: row.target_ref ?? null,
      text: row.edited_text ?? row.suggested_text,
      flags: row.flags,
      confirmedByUser: row.confirmed_by_user,
    };
  });

  const base = await loadVersion(supabase, analysis.resume_version_id);
  let next;
  try {
    next = applySuggestions(base.cv, accepted);
  } catch (err) {
    if (err instanceof ApplyError) throw new HttpError("invalid_input", err.code);
    throw err;
  }
  // Applying the same decisions twice (double click, retry) must not create duplicate versions.
  const { data: previous } = await supabase
    .from("resume_versions")
    .select("id, version_number, data")
    .eq("resume_id", base.resumeId)
    .eq("analysis_id", id)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  // jsonb does not keep key order: compare through the schema, which yields a canonical shape.
  if (previous && JSON.stringify(cvDataSchema.parse(previous.data)) === JSON.stringify(next)) {
    return NextResponse.json({ versionId: previous.id, versionNumber: previous.version_number, resumeId: base.resumeId, unchanged: true });
  }

  // The version records which items the user confirmed themselves (not proven by the original CV).
  const confirmed = accepted.filter((s) => s.kind === "confirm" && s.confirmedByUser).map((s) => s.targetRef?.skill).filter(Boolean);
  const label = confirmed.length ? `confirmed_by_user: ${confirmed.join(", ")}`.slice(0, 200) : "";
  const version = await insertVersion(supabase, { resumeId: base.resumeId, userId: user.id, data: next, origin: "suggestions", analysisId: id, label });
  analytics.feature(user.id, "versao_criada");
  return NextResponse.json({ versionId: version.id, versionNumber: version.version_number, resumeId: base.resumeId });
});
