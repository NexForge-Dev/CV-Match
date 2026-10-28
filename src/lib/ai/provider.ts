import type { CvData } from "@/lib/cv/schema";
import type { Requirement } from "@/lib/analysis/requirements";
import type { SuggestionDraft, SuggestionInput } from "@/lib/analysis/suggestions";
import type { ExtrasInput, InterviewItem } from "@/lib/analysis/extras";

export interface AiUsage {
  provider: string;
  model: string | null;
  inputTokens: number;
  outputTokens: number;
}

export interface AiResult<T> {
  value: T;
  usage: AiUsage;
}

/**
 * LLM abstraction. Every provider returns plain, schema-validated data; the
 * pipeline then grounds and fact-checks it, so providers are interchangeable.
 * Matching itself is deterministic (see analysis/match.ts) to keep it explainable.
 */
export interface AiProvider {
  readonly name: string;
  parseCv(text: string): Promise<AiResult<CvData>>;
  extractRequirements(jobText: string): Promise<AiResult<Requirement[]>>;
  writeSuggestions(input: SuggestionInput): Promise<AiResult<SuggestionDraft[]>>;
  coverLetter(input: ExtrasInput): Promise<AiResult<string>>;
  interviewPrep(input: ExtrasInput): Promise<AiResult<InterviewItem[]>>;
}

export const noUsage = (provider: string): AiUsage => ({ provider, model: null, inputTokens: 0, outputTokens: 0 });
