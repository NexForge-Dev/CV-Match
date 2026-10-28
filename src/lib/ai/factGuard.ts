import { SKILLS, findEvidencedSkills, findSkills, skillTerms } from "@/lib/analysis/taxonomy";
import { normalize, tokenize } from "@/lib/analysis/text";

export interface FactCheck {
  ok: boolean;
  newNumbers: string[];
  newSkills: string[];
  newEntities: string[];
  newCredentials: string[];
}

// NFKC first so full-width / other Unicode digits ("１０", "٣") cannot slip past an ASCII-only pattern.
// Digits glued to letters are part of a name or code (CEFR "B2", "ES6", "EC2", "OAuth2"), not a metric.
const NUMBER = /(?<![\p{L}\d])\d+(?:[.,]\d{3})*(?:[.,]\d+)?\s*%?/gu;

/** Canonical form of a number: "1.000" / "1,000" -> "1000", "2,5" -> "2.5", "40 %" -> "40%". */
export function canonicalNumber(raw: string): string {
  const pct = raw.includes("%") ? "%" : "";
  let n = raw.replace(/%/g, "").trim();
  if (/^\d{1,3}([.,]\d{3})+$/.test(n)) n = n.replace(/[.,]/g, "");
  else n = n.replace(/\s+/g, "").replace(",", ".");
  n = n.replace(/^0+(?=\d)/, "");
  return n + pct;
}

const IS_DIGIT = /\p{Nd}/u;

/** Maps every script's decimal digits (Arabic-Indic, Devanagari, ...) to ASCII; NFKC handles full-width forms. */
function unicodeDigits(text: string): string {
  return text.normalize("NFKC").replace(/\p{Nd}/gu, (d) => {
    if (d >= "0" && d <= "9") return d;
    const code = d.codePointAt(0)!;
    // Each script's digits are a contiguous run starting at its zero.
    let zero = code;
    while (code - zero < 9 && IS_DIGIT.test(String.fromCodePoint(zero - 1))) zero--;
    return String(code - zero);
  });
}

export function numbersIn(text: string): string[] {
  return (unicodeDigits(text).match(NUMBER) ?? []).map(canonicalNumber);
}

/** Credentials and degrees: claiming one that the CV does not mention is fabrication. */
const CREDENTIAL_TERMS = [
  "certified", "certification", "certificate", "certificado", "certificada", "certificacao", "certificacion",
  "mba", "phd", "ph.d", "doctorate", "doutorado", "doctorado", "masters", "master's", "mestrado", "maestria", "msc",
  "bachelor", "bachelors", "bacharelado", "licenciatura", "bsc", "pmp", "cissp", "ccna",
];

function credentialsIn(text: string): string[] {
  const n = normalize(text);
  return CREDENTIAL_TERMS.filter((t) => new RegExp(`(^|[^a-z0-9])${t.replace(/[.']/g, "\\$&")}([^a-z0-9]|$)`).test(n));
}

// Words that are part of a known technology name are checked by the skill check, not as entities.
const SKILL_WORDS = new Set(SKILLS.flatMap((s) => skillTerms(s).flatMap((t) => t.split(/\s+/))));

/** Capitalised words that are not sentence-initial — a cheap proxy for names of companies/products. */
function entitiesIn(text: string): string[] {
  const out: string[] = [];
  for (const sentence of text.split(/[.!?:\n]+/)) {
    const words = sentence.trim().split(/\s+/).slice(1);
    for (const w of words) {
      const clean = w.replace(/^[("'“]+|[)"'”,;:]+$/g, "");
      if (/^[A-ZÁÉÍÓÚÂÊÔÃÕÇÑ][\wÀ-ÿ&+-]{2,}$/.test(clean) && !SKILL_WORDS.has(normalize(clean))) out.push(clean);
    }
  }
  return out;
}

/**
 * Verifies that generated text introduces no facts absent from the source.
 * - numbers / percentages must already exist in the source (or be explicitly allowed, e.g. computed years)
 * - technologies and spoken languages must be *evidenced* in the source; a mention such as
 *   "no experience with Kubernetes" or "learning Rust" does not count as evidence
 * - certifications and degrees must already be mentioned in the source
 * - capitalised entity-like words must appear in the source or in allowedText (reported; fatal when strictEntities)
 */
export function checkFacts(
  generated: string,
  sourceText: string,
  opts: { allowedNumbers?: string[]; allowedText?: string; strictEntities?: boolean } = {},
): FactCheck {
  const sourceNorm = normalize(sourceText);
  const allowedNorm = normalize(opts.allowedText ?? "");
  const sourceNumbers = new Set(numbersIn(sourceText));
  for (const n of opts.allowedNumbers ?? []) sourceNumbers.add(canonicalNumber(n));

  const newNumbers = numbersIn(generated).filter((n) => !sourceNumbers.has(n) && !sourceNumbers.has(n.replace("%", "")));

  const sourceSkills = new Set(findEvidencedSkills(sourceText).map((s) => s.id));
  const newSkills = findSkills(generated).filter((s) => !sourceSkills.has(s.id)).map((s) => s.label);

  const sourceCredentials = new Set(credentialsIn(sourceText));
  const newCredentials = credentialsIn(generated).filter((c) => !sourceCredentials.has(c));

  const sourceTokens = new Set(tokenize(sourceText));
  const allowedTokens = new Set(tokenize(opts.allowedText ?? ""));
  const newEntities = Array.from(
    new Set(
      entitiesIn(generated).filter((e) => {
        const n = normalize(e);
        return !sourceTokens.has(n) && !allowedTokens.has(n) && !sourceNorm.includes(n) && !allowedNorm.includes(n);
      }),
    ),
  ).slice(0, 10);

  return {
    ok: newNumbers.length === 0 && newSkills.length === 0 && newCredentials.length === 0 && (!opts.strictEntities || newEntities.length === 0),
    newNumbers,
    newSkills,
    newEntities,
    newCredentials,
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
