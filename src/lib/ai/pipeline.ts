import { env } from "@/lib/env";
import { log } from "@/lib/log";
import { cvToPlainText, type CvData, type CvLanguage } from "@/lib/cv/schema";
import { computeScore, matchRequirements, type MatchResult, type ScoreBreakdown } from "@/lib/analysis/match";
import type { Requirement } from "@/lib/analysis/requirements";
import { derivedNumbers, guardSuggestions, type SuggestionDraft } from "@/lib/analysis/suggestions";
import { heuristicCoverLetter, type ExtrasInput, type InterviewItem } from "@/lib/analysis/extras";
import { AnthropicProvider } from "./anthropic";
import { checkFacts } from "./factGuard";
import { heuristicProvider } from "./heuristic";
import type { AiProvider, AiResult, AiUsage } from "./provider";

let providerOverride: AiProvider | null = null;

/** Test hook: inject a fake provider. */
export function setProviderForTests(p: AiProvider | null) {
  providerOverride = p;
}

export function getProvider(): AiProvider {
  if (providerOverride) return providerOverride;
  const e = env();
  if (e.AI_PROVIDER === "anthropic" && e.ANTHROPIC_API_KEY) {
    return new AnthropicProvider(e.ANTHROPIC_API_KEY, e.AI_MODEL, e.AI_MAX_INPUT_CHARS);
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
  const { kept, dropped } = guardSuggestions(written.value, params.cv, { allowedNumbers: derivedNumbers(params.cv), jobText: params.jobText });
  const limited = params.maxSuggestions != null ? kept.slice(0, params.maxSuggestions) : kept;
  if (dropped) log.info("ai.suggestions_dropped_by_fact_guard", { dropped });
  return { results, score, suggestions: limited, droppedSuggestions: dropped, usage: [written.usage] };
}

export async function coverLetter(input: ExtrasInput): Promise<AiResult<string>> {
  const r = await withFallback<string>("cover_letter", (p) => p.coverLetter(input));
  const check = checkFacts(r.value, cvToPlainText(input.cv), {
    allowedNumbers: derivedNumbers(input.cv),
    allowedText: `${input.job.title} ${input.job.company}`,
  });
  if (!check.ok) {
    log.warn("ai.cover_letter_rejected_by_fact_guard", { numbers: check.newNumbers.length, skills: check.newSkills.length });
    return { value: heuristicCoverLetter(input), usage: r.usage };
  }
  return r;
}

export async function interviewPrep(input: ExtrasInput): Promise<AiResult<InterviewItem[]>> {
  return withFallback<InterviewItem[]>("interview_prep", (p) => p.interviewPrep(input));
}
