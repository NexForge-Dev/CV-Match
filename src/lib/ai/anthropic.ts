import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { cvDataSchema, cvToPlainText, newId, type CvData } from "@/lib/cv/schema";
import { requirementSchema, type Requirement } from "@/lib/analysis/requirements";
import { generateHeuristicSuggestions, type SuggestionDraft } from "@/lib/analysis/suggestions";
import { findSkills } from "@/lib/analysis/taxonomy";
import { interviewItemSchema } from "@/lib/analysis/extras";
import { isGrounded } from "./factGuard";
import { UNTRUSTED_DATA_RULES, wrapUntrusted } from "./safety";
import type { AiProvider, AiUsage } from "./provider";

// Output schemas kept flat and constraint-free for structured outputs; the
// strict domain schemas are applied afterwards.
const LlmCv = z.object({
  fullName: z.string(),
  headline: z.string(),
  email: z.string(),
  phone: z.string(),
  location: z.string(),
  links: z.array(z.string()),
  summary: z.string(),
  experiences: z.array(z.object({ title: z.string(), company: z.string(), location: z.string(), start: z.string(), end: z.string(), bullets: z.array(z.string()) })),
  education: z.array(z.object({ degree: z.string(), institution: z.string(), start: z.string(), end: z.string(), details: z.string() })),
  skills: z.array(z.string()),
  projects: z.array(z.object({ name: z.string(), description: z.string(), technologies: z.array(z.string()), link: z.string() })),
  languages: z.array(z.object({ name: z.string(), level: z.string() })),
  certifications: z.array(z.string()),
});

const LlmRequirements = z.object({
  requirements: z.array(
    z.object({
      label: z.string(),
      sourceText: z.string(),
      category: z.enum(["skill", "language", "education", "experience", "soft", "other"]),
      importance: z.enum(["must", "nice"]),
      minYears: z.number().nullable(),
      minLevel: z.string().nullable(),
    }),
  ),
});

const LlmRewrites = z.object({
  summary: z.string(),
  bullets: z.array(z.object({ experienceIndex: z.number(), bulletIndex: z.number(), rewrite: z.string(), rationale: z.string() })),
  summaryRationale: z.string(),
});

const LlmLetter = z.object({ letter: z.string() });
const LlmInterview = z.object({ items: z.array(z.object({ requirement: z.string(), question: z.string(), evidence: z.array(z.string()), tip: z.string() })) });

const LANG_NAME = { pt: "Portuguese", es: "Spanish", en: "English" } as const;

export class AnthropicProvider implements AiProvider {
  readonly name = "anthropic";
  private client: Anthropic;

  constructor(
    apiKey: string,
    private model: string,
    private maxChars: number,
  ) {
    this.client = new Anthropic({ apiKey, maxRetries: 2, timeout: 120_000 });
  }

  private async call<S extends z.ZodType>(schema: S, system: string, user: string): Promise<{ data: z.infer<S>; usage: AiUsage }> {
    const response = await this.client.beta.messages.parse({
      model: this.model,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: `${system}\n\n${UNTRUSTED_DATA_RULES}`,
      messages: [{ role: "user", content: user }],
      output_config: { effort: "medium", format: betaZodOutputFormat(schema) },
    });
    if (response.stop_reason === "refusal") throw new Error("model_refusal");
    if (response.stop_reason === "max_tokens") throw new Error("model_truncated");
    if (!response.parsed_output) throw new Error("model_unparseable");
    return {
      data: response.parsed_output as z.infer<S>,
      usage: { provider: this.name, model: this.model, inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens },
    };
  }

  async parseCv(text: string) {
    const { data, usage } = await this.call(
      LlmCv,
      "You extract the structure of a resume. Copy text verbatim from the resume; do not rephrase, translate, summarise or add anything. Use empty strings or empty lists for anything not present. Keep the original order. Dates exactly as written.",
      wrapUntrusted("cv", text, this.maxChars),
    );
    // Grounding: drop any item that cannot be found in the source text.
    const g = (s: string) => (s && isGrounded(s, text, 0.7) ? s : "");
    const cv: CvData = cvDataSchema.parse({
      contact: { fullName: g(data.fullName), headline: g(data.headline), email: g(data.email), phone: g(data.phone), location: g(data.location), links: data.links.filter((l) => isGrounded(l, text)) },
      summary: g(data.summary),
      experiences: data.experiences
        .map((e) => ({ id: newId("exp"), title: g(e.title), company: g(e.company), location: g(e.location), start: g(e.start), end: g(e.end), bullets: e.bullets.filter((b) => isGrounded(b, text, 0.7)) }))
        .filter((e) => e.title || e.company || e.bullets.length),
      education: data.education
        .map((e) => ({ id: newId("edu"), degree: g(e.degree), institution: g(e.institution), start: g(e.start), end: g(e.end), details: g(e.details) }))
        .filter((e) => e.degree || e.institution),
      skills: data.skills.filter((s) => isGrounded(s, text)),
      projects: data.projects
        .map((p) => ({ id: newId("prj"), name: g(p.name), description: g(p.description), technologies: p.technologies.filter((t) => isGrounded(t, text)), link: g(p.link) }))
        .filter((p) => p.name || p.description),
      languages: data.languages.filter((l) => isGrounded(l.name, text)).map((l) => ({ name: l.name, level: g(l.level) })),
      certifications: data.certifications.filter((c) => isGrounded(c, text, 0.7)),
    });
    return { value: cv, usage };
  }

  async extractRequirements(jobText: string) {
    const { data, usage } = await this.call(
      LlmRequirements,
      "You extract the candidate requirements from a job advert. One requirement per distinct skill, technology, language, education or experience demand. Ignore benefits, company description and salary. `sourceText` must be copied verbatim from the advert. importance is 'nice' for desirable/bonus/valued items, otherwise 'must'. minLevel is a CEFR level or level word for spoken languages, else null.",
      wrapUntrusted("job", jobText, this.maxChars),
    );
    const requirements: Requirement[] = [];
    for (const r of data.requirements.slice(0, 60)) {
      if (!isGrounded(r.sourceText, jobText, 0.6)) continue; // invented requirement
      const skills = findSkills(`${r.label} ${r.sourceText}`).filter((s) => (r.category === "language" ? s.category === "spoken" : s.category !== "spoken"));
      const skillIds = r.category === "skill" || r.category === "language" ? skills.map((s) => s.id).slice(0, 4) : [];
      const parsed = requirementSchema.safeParse({
        id: newId("req"),
        label: r.label.slice(0, 200),
        sourceText: r.sourceText.slice(0, 600),
        category: r.category === "skill" && !skillIds.length ? "other" : r.category,
        importance: r.importance,
        skillIds,
        anyOf: skillIds.length > 1 && /\b(or|ou|o)\b|\//i.test(r.sourceText),
        minYears: r.minYears !== null && r.minYears >= 0 && r.minYears <= 40 ? r.minYears : null,
        minLevel: r.minLevel ? r.minLevel.slice(0, 20) : null,
      });
      if (parsed.success) requirements.push(parsed.data);
    }
    return { value: requirements, usage };
  }

  async writeSuggestions(input: Parameters<AiProvider["writeSuggestions"]>[0]) {
    // Structural suggestions (ordering, confirmations, gap advice) stay deterministic.
    const structural = generateHeuristicSuggestions(input).filter((d) => d.kind !== "summary" && d.kind !== "bullet_rewrite");
    const cvText = cvToPlainText(input.cv);
    const reqList = input.requirements
      .map((r) => {
        const res = input.results.find((x) => x.requirementId === r.id);
        return `- [${r.importance}] ${r.label}: ${res?.status ?? "unknown"}`;
      })
      .join("\n");
    const experiences = input.cv.experiences
      .map((e, i) => `Experience ${i}: ${e.title} — ${e.company}\n${e.bullets.map((b, j) => `  bullet ${j}: ${b}`).join("\n")}`)
      .join("\n");
    const { data, usage } = await this.call(
      LlmRewrites,
      `You improve a resume for a specific job, writing in ${LANG_NAME[input.language]}. Rewrite the professional summary and the experience bullets for clarity, concision and the job's terminology. Rules: keep every fact exactly as in the resume; never add numbers, metrics, percentages, technologies, employers, titles or achievements that are not in the resume; only rewrite bullets where you add real clarity (omit others). Rationale: one short sentence in ${LANG_NAME[input.language]}.`,
      `${wrapUntrusted("cv", cvText, this.maxChars)}\n\nExperience bullets with indices:\n${wrapUntrusted("cv", experiences, this.maxChars)}\n\nJob requirements and whether the resume shows them:\n${wrapUntrusted("job", reqList, 8000)}`,
    );
    const drafts: SuggestionDraft[] = [];
    if (data.summary.trim()) {
      drafts.push({ kind: "summary", section: "summary", targetRef: null, original: input.cv.summary, suggested: data.summary.trim(), rationale: data.summaryRationale, requiresConfirmation: false, flags: [] });
    }
    for (const b of data.bullets) {
      const exp = input.cv.experiences[b.experienceIndex];
      const original = exp?.bullets[b.bulletIndex];
      if (!exp || original === undefined || !b.rewrite.trim()) continue;
      drafts.push({ kind: "bullet_rewrite", section: "experience", targetRef: { experienceId: exp.id, bulletIndex: b.bulletIndex }, original, suggested: b.rewrite.trim(), rationale: b.rationale, requiresConfirmation: false, flags: [] });
    }
    return { value: [...drafts, ...structural], usage };
  }

  async coverLetter(input: Parameters<AiProvider["coverLetter"]>[0]) {
    const found = input.requirements
      .filter((r) => input.results.find((x) => x.requirementId === r.id)?.status === "found")
      .map((r) => r.label)
      .join(", ");
    const { data, usage } = await this.call(
      LlmLetter,
      `Write a concise cover letter (max 300 words) in ${LANG_NAME[input.language]} for the job below, using only facts from the resume. Never invent experience, numbers, results or technologies. Do not claim requirements the resume does not show. Sign with the candidate's name from the resume.`,
      `${wrapUntrusted("cv", cvToPlainText(input.cv), this.maxChars)}\n\nJob title: ${input.job.title}\nCompany: ${input.job.company}\nRequirements the resume shows: ${found || "none identified"}`,
    );
    return { value: data.letter, usage };
  }

  async interviewPrep(input: Parameters<AiProvider["interviewPrep"]>[0]) {
    const reqs = input.requirements
      .map((r) => `- ${r.label} (${input.results.find((x) => x.requirementId === r.id)?.status ?? "unknown"})`)
      .join("\n");
    const { data, usage } = await this.call(
      LlmInterview,
      `Prepare up to 10 likely interview questions for this job in ${LANG_NAME[input.language]}. For each, quote verbatim resume lines as evidence (empty list if none) and give an honest preparation tip. Never suggest claiming experience the resume does not show.`,
      `${wrapUntrusted("cv", cvToPlainText(input.cv), this.maxChars)}\n\nJob: ${input.job.title} — ${input.job.company}\nRequirements and status:\n${wrapUntrusted("job", reqs, 8000)}`,
    );
    const cvText = cvToPlainText(input.cv);
    const items = data.items
      .slice(0, 12)
      .map((i) => ({ ...i, evidence: i.evidence.filter((e) => isGrounded(e, cvText)).slice(0, 3) }))
      .map((i) => interviewItemSchema.safeParse(i))
      .filter((p) => p.success)
      .map((p) => p.data!);
    return { value: items, usage };
  }
}

