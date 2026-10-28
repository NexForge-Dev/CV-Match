import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cvDataSchema, type CvData } from "@/lib/cv/schema";
import { HttpError } from "@/lib/api";

/** Inserts a new immutable version with the next number (retries once on a concurrent insert). */
export async function insertVersion(
  supabase: SupabaseClient,
  params: { resumeId: string; userId: string; data: CvData; origin: "import" | "manual" | "suggestions" | "duplicate"; label?: string; analysisId?: string | null },
) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data: last } = await supabase
      .from("resume_versions")
      .select("version_number")
      .eq("resume_id", params.resumeId)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    const versionNumber = (last?.version_number ?? 0) + 1;
    const { data, error } = await supabase
      .from("resume_versions")
      .insert({
        resume_id: params.resumeId,
        user_id: params.userId,
        version_number: versionNumber,
        origin: params.origin,
        label: params.label ?? "",
        analysis_id: params.analysisId ?? null,
        data: cvDataSchema.parse(params.data),
      })
      .select("id, version_number")
      .single();
    if (!error) {
      await supabase.from("resumes").update({ updated_at: new Date().toISOString() }).eq("id", params.resumeId);
      return data;
    }
    if (error.code !== "23505") throw error; // unique violation -> retry with next number
  }
  throw new HttpError("conflict");
}

export async function loadVersion(supabase: SupabaseClient, versionId: string) {
  const { data } = await supabase
    .from("resume_versions")
    .select("id, resume_id, version_number, data, resumes(id, title, language, template)")
    .eq("id", versionId)
    .maybeSingle();
  if (!data) throw new HttpError("not_found");
  const resume = (Array.isArray(data.resumes) ? data.resumes[0] : data.resumes) as { id: string; title: string; language: "pt" | "es" | "en"; template: "classic" | "modern" } | null;
  if (!resume) throw new HttpError("not_found");
  return { id: data.id as string, resumeId: data.resume_id as string, versionNumber: data.version_number as number, cv: cvDataSchema.parse(data.data), resume };
}
