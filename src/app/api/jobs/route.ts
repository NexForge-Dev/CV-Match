import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJson, withUser } from "@/lib/api";
import { cvLanguageSchema } from "@/lib/cv/schema";
import { extractJobRequirements } from "@/lib/ai/pipeline";
import { createAdminClient } from "@/lib/supabase/admin";
import { completeUsage, reserveUsage } from "@/lib/server/usage";

export const runtime = "nodejs";
export const maxDuration = 60;

const schema = z.object({
  title: z.string().trim().max(200).default(""),
  company: z.string().trim().max(200).default(""),
  location: z.string().trim().max(200).default(""),
  language: cvLanguageSchema.default("en"),
  url: z
    .string()
    .trim()
    .max(1000)
    .refine((u) => u === "" || /^https?:\/\//i.test(u), "url")
    .default(""),
  rawText: z.string().trim().min(30).max(30000),
});

/** Stores a pasted job description and extracts its requirements. No scraping. */
export const POST = withUser(async (req, _ctx, { user, supabase }) => {
  const body = await parseJson(req, schema);
  const admin = createAdminClient();
  const usageId = await reserveUsage(admin, user.id, "extract_requirements");
  const extracted = await extractJobRequirements(body.rawText);
  await completeUsage(admin, usageId, extracted.usage);

  const { data, error } = await supabase
    .from("job_descriptions")
    .insert({
      user_id: user.id,
      title: body.title,
      company: body.company,
      location: body.location,
      language: body.language,
      url: body.url,
      raw_text: body.rawText,
      requirements: extracted.value,
    })
    .select("id, requirements")
    .single();
  if (error) throw error;
  return NextResponse.json({ jobId: data.id, requirements: data.requirements });
});
