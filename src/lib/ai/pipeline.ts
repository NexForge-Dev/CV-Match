import { aiProvider, env } from "@/lib/env";
import { log } from "@/lib/log";
import { cvToPlainText, type CvData, type CvLanguage } from "@/lib/cv/schema";
import { computeScore, matchRequirements, type MatchResult, type ScoreBreakdown } from "@/lib/analysis/match";
import type { Requirement } from "@/lib/analysis/requirements";
import { derivedNumbers, guardSuggestions, type SuggestionDraft } from "@/lib/analysis/suggestions";
import { heuristicCoverLetter, heuristicInterviewPrep, type ExtrasInput, type InterviewItem } from "@/lib/analysis/extras";
import { AnthropicProvider } from "./anthropic";
import { checkFacts, isGrounded } from "./factGuard";
import { heuristicProvider } from "./heuristic";
import { noUsage, type AiProvider, type AiResult, type AiUsage } from "./provider";

let providerOverride: AiProvider | null = null;

/** Test hook: inject a fake provider. */
export function setProviderForTests(p: AiProvider | null) {
  providerOverride = p;
}

export function getProvider(): AiProvider {
  if (providerOverride) return providerOverride;
  const e = env();
  if (aiProvider(e) === "anthropic") {
    return new AnthropicProvider(e.ANTHROPIC_API_KEY!, { extract: e.AI_MODEL_EXTRACT, write: e.AI_MODEL_WRITE }, e.AI_MAX_INPUT_CHARS);
  }
  return heuristicProvider;
}

/** Runs a provider task, falling back to the deterministic provider on any LLM failure. */
async function withFallback<T>(task: string, run: (p: AiProvider) => Promise<AiResult<T>>): Promise<AiResult<T> & { fallback: boolean }> {
  const provider = getProvider();
  try {
    return { ...(await run(provider)), fallback: false };
  } catch (err) {
    if (provider === heuristicProvider) throw err;
    log.warn("ai.fallback", { task, provider: provider.name, error: err instanceof Error ? err.message : "unknown" });
    return { ...(await run(heuristicProvider)), fallback: true };
  }
}

export async function parseCv(text: string) {
  return withFallback<CvData>("parse_cv", (p) => p.parseCv(text));
}

export async function extractJobRequirements(jobText: string) {
  const r = await withFallback<Requirement[]>("extract_requirements", (p) => p.extractRequirements(jobText));
  // If the model found nothing usable, the deterministic extractor still gives a result.
  if (!r.value.length && getProvider() !== heuristicProvider) {
    const h = await heuristicProvider.extractRequirements(jobText);
    return { ...h, fallback: true };
  }
  return r;
}

export interface AnalysisOutput {
  results: MatchResult[];
  score: ScoreBreakdown;
  suggestions: SuggestionDraft[];
  droppedSuggestions: number;
  usage: AiUsage[];
  /** True when the configured AI failed and the rule-based engine produced the suggestions. */
  fallback: boolean;
}

/**
 * Full analysis: deterministic evidence matching + score, then suggestion
 * writing (LLM or heuristic) passed through the fact guard.
 */
export async function analyze(params: {
  cv: CvData;
  requirements: Requirement[];
  jobText: string;
  language: CvLanguage;
  maxSuggestions?: number | null;
}): Promise<AnalysisOutput> {
  const results = matchRequirements(params.cv, params.requirements);
  const score = computeScore(params.requirements, results);
  const written = await withFallback<SuggestionDraft[]>("suggestions", (p) =>
    p.writeSuggestions({ cv: params.cv, requirements: params.requirements, results, language: params.language, jobText: params.jobText }),
  );
  // Model-written text must not introduce unknown proper names either; the rule-based engine only reuses CV text.
  const strictEntities = written.usage.provider !== heuristicProvider.name;
  const { kept, dropped } = guardSuggestions(written.value, params.cv, { allowedNumbers: derivedNumbers(params.cv), jobText: params.jobText, strictEntities });
  const limited = params.maxSuggestions != null ? kept.slice(0, params.maxSuggestions) : kept;
  if (dropped) log.info("ai.suggestions_dropped_by_fact_guard", { dropped });
  return { results, score, suggestions: limited, droppedSuggestions: dropped, usage: [written.usage], fallback: written.fallback };
}

export type ExtraResult<T> = AiResult<T> & { fallback: boolean };

export async function coverLetter(input: ExtrasInput): Promise<ExtraResult<string>> {
  const r = await withFallback<string>("cover_letter", (p) => p.coverLetter(input));
  const check = checkFacts(r.value, cvToPlainText(input.cv), {
    allowedNumbers: derivedNumbers(input.cv),
    allowedText: `${input.job.title} ${input.job.company}`,
    // A letter has no reviewer before it is sent: a company or person the CV never names is an invented fact.
    strictEntities: true,
  });
  if (!check.ok) {
    log.warn("ai.cover_letter_rejected_by_fact_guard", { numbers: check.newNumbers.length, skills: check.newSkills.length, credentials: check.newCredentials.length, entities: check.newEntities.length });
    // Honest fallback: the rule-based letter, labelled as such (never presented as the AI result).
    return { value: heuristicCoverLetter(input), usage: noUsage(heuristicProvider.name), fallback: r.usage.provider !== heuristicProvider.name };
  }
  return r;
}

/**
 * Interview prep may talk about the job's requirements, but evidence quotes
 * must come from the CV and no other new facts (numbers, technologies,
 * credentials) may appear. Failing items are dropped; if nothing survives the
 * rule-based questions are used instead.
 */
export async function interviewPrep(input: ExtrasInput): Promise<ExtraResult<InterviewItem[]>> {
  const r = await withFallback<InterviewItem[]>("interview_prep", (p) => p.interviewPrep(input));
  const cvText = cvToPlainText(input.cv);
  const jobFacts = input.requirements.map((q) => `${q.label}. ${q.sourceText}`).join("\n");
  const allowedNumbers = derivedNumbers(input.cv);
  const items = r.value
    .map((i) => ({ ...i, evidence: i.evidence.filter((e) => isGrounded(e, cvText)) }))
    .filter((i) => checkFacts(`${i.question}\n${i.tip}`, `${cvText}\n${jobFacts}`, { allowedNumbers }).ok);
  if (!items.length && r.value.length) {
    log.warn("ai.interview_prep_rejected_by_fact_guard", { items: r.value.length });
    return { value: heuristicInterviewPrep(input), usage: noUsage(heuristicProvider.name), fallback: r.usage.provider !== heuristicProvider.name };
  }
  return { ...r, value: items };
}
