import { findSkills } from "@/lib/analysis/taxonomy";
import { normalize, tokenize } from "@/lib/analysis/text";

export interface FactCheck {
  ok: boolean;
  newNumbers: string[];
  newSkills: string[];
  newEntities: string[];
}

const NUMBER = /\d+(?:[.,]\d+)*\s*%?/g;

function numbersIn(text: string): string[] {
  return (text.match(NUMBER) ?? []).map((n) => n.replace(/\s+/g, "").replace(",", "."));
}

/** Capitalised words that are not sentence-initial — a cheap proxy for names of companies/products. */
function entitiesIn(text: string): string[] {
  const out: string[] = [];
  for (const sentence of text.split(/[.!?\n]+/)) {
    const words = sentence.trim().split(/\s+/).slice(1);
    for (const w of words) {
      const clean = w.replace(/^[("'“]+|[)"'”,;:]+$/g, "");
      if (/^[A-ZÁÉÍÓÚÂÊÔÃÕÇÑ][\wÀ-ÿ&+-]{2,}$/.test(clean)) out.push(clean);
    }
  }
  return out;
}

/**
 * Verifies that generated text introduces no facts absent from the source.
 * - numbers / percentages must already exist in the source (or be explicitly allowed, e.g. computed years)
 * - technologies from the skills taxonomy must already be evidenced in the source
 * - capitalised entity-like words must appear in the source or in the job ad (allowedText)
 */
export function checkFacts(generated: string, sourceText: string, opts: { allowedNumbers?: string[]; allowedText?: string } = {}): FactCheck {
  const sourceNorm = normalize(sourceText);
  const allowedNorm = normalize(opts.allowedText ?? "");
  const sourceNumbers = new Set(numbersIn(sourceText));
  for (const n of opts.allowedNumbers ?? []) sourceNumbers.add(n);

  const newNumbers = numbersIn(generated).filter((n) => !sourceNumbers.has(n) && !sourceNumbers.has(n.replace("%", "")));

  const sourceSkills = new Set(findSkills(sourceText).map((s) => s.id));
  const newSkills = findSkills(generated).filter((s) => !sourceSkills.has(s.id)).map((s) => s.label);

  const sourceTokens = new Set(tokenize(sourceText));
  const allowedTokens = new Set(tokenize(opts.allowedText ?? ""));
  const newEntities = entitiesIn(generated).filter((e) => {
    const n = normalize(e);
    return !sourceTokens.has(n) && !allowedTokens.has(n) && !sourceNorm.includes(n) && !allowedNorm.includes(n);
  });

  return {
    ok: newNumbers.length === 0 && newSkills.length === 0,
    newNumbers,
    newSkills,
    newEntities: Array.from(new Set(newEntities)).slice(0, 10),
  };
}

/** True when a quote can be found (after normalisation) in the source text. Used to ground LLM evidence. */
export function isGrounded(quote: string, sourceText: string, minCoverage = 0.8): boolean {
  const q = normalize(quote).replace(/…$/, "");
  if (!q) return false;
  const src = normalize(sourceText);
  if (src.includes(q)) return true;
  const tokens = tokenize(quote);
  if (!tokens.length) return false;
  const srcTokens = new Set(tokenize(sourceText));
  return tokens.filter((t) => srcTokens.has(t)).length / tokens.length >= minCoverage;
}
