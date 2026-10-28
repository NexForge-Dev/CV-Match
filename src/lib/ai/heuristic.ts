import { parseCvText } from "@/lib/cv/parse";
import { extractRequirements } from "@/lib/analysis/requirements";
import { generateHeuristicSuggestions } from "@/lib/analysis/suggestions";
import { heuristicCoverLetter, heuristicInterviewPrep } from "@/lib/analysis/extras";
import { noUsage, type AiProvider } from "./provider";

/** Deterministic, offline provider. Used when no LLM is configured and as a fallback on LLM errors. */
export const heuristicProvider: AiProvider = {
  name: "heuristic",
  async parseCv(text) {
    return { value: parseCvText(text), usage: noUsage("heuristic") };
  },
  async extractRequirements(jobText) {
    return { value: extractRequirements(jobText), usage: noUsage("heuristic") };
  },
  async writeSuggestions(input) {
    return { value: generateHeuristicSuggestions(input), usage: noUsage("heuristic") };
  },
  async coverLetter(input) {
    return { value: heuristicCoverLetter(input), usage: noUsage("heuristic") };
  },
  async interviewPrep(input) {
    return { value: heuristicInterviewPrep(input), usage: noUsage("heuristic") };
  },
};
