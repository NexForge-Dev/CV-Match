import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { uuidLike } from "@/lib/api";
import { cvDataSchema } from "@/lib/cv/schema";
import { ResumeEditor, type VersionRow } from "@/components/app/ResumeEditor";

export const metadata: Metadata = { title: "CV editor" };

export default async function ResumePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuidLike.test(id)) notFound();
  const { supabase } = await requireUser(`/resumes/${id}`);
  const [{ data: resume }, { data: versions }] = await Promise.all([
    supabase.from("resumes").select("id, title, language, template").eq("id", id).maybeSingle(),
    supabase.from("resume_versions").select("id, version_number, origin, label, created_at, data").eq("resume_id", id).order("version_number", { ascending: false }),
  ]);
  if (!resume || !versions?.length) notFound();

  const rows: VersionRow[] = versions.map((v) => ({
    id: v.id,
    number: v.version_number,
    origin: v.origin,
    label: v.label,
    createdAt: v.created_at,
    cv: cvDataSchema.parse(v.data),
  }));

  return <ResumeEditor resume={resume as { id: string; title: string; language: "pt" | "es" | "en"; template: "classic" | "modern" }} versions={rows} />;
}
