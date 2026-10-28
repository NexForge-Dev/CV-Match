import { z } from "zod";
import type { CvData } from "@/lib/cv/schema";
import type { Requirement } from "./requirements";
import { getSkill, mentionsSkill } from "./taxonomy";
import { containsTerm, jaccard, normalize, tokenize } from "./text";

export const MATCH_STATUSES = ["found", "partial", "not_found", "ambiguous"] as const;
export type MatchStatus = (typeof MATCH_STATUSES)[number];

export const evidenceSchema = z.object({
  section: z.enum(["summary", "experience", "projects", "skills", "education", "languages", "certifications", "headline"]),
  ref: z.string().nullable().default(null),
  quote: z.string().max(400),
});
export type Evidence = z.infer<typeof evidenceSchema>;

export const NOTE_CODES = [
  "listed_without_context",
  "related_skill",
  "years_below_required",
  "years_unverified",
  "level_below_required",
  "level_unverified",
  "field_unclear",
  "soft_skill_needs_example",
  "not_in_document",
  "ambiguous_requirement",
] as const;
export type NoteCode = (typeof NOTE_CODES)[number];

export const matchResultSchema = z.object({
  requirementId: z.string(),
  status: z.enum(MATCH_STATUSES),
  evidence: z.array(evidenceSchema).max(5),
  notes: z.array(z.enum(NOTE_CODES)).default([]),
  relatedSkills: z.array(z.string()).default([]),
});
export type MatchResult = z.infer<typeof matchResultSchema>;

interface Chunk {
  section: Evidence["section"];
  ref: string | null;
  text: string;
}

/** Evidence corpus: every addressable piece of the CV, tagged with where it came from. */
export function cvChunks(cv: CvData): Chunk[] {
  const chunks: Chunk[] = [];
  if (cv.contact.headline) chunks.push({ section: "headline", ref: null, text: cv.contact.headline });
  if (cv.summary) chunks.push({ section: "summary", ref: null, text: cv.summary });
  for (const e of cv.experiences) {
    chunks.push({ section: "experience", ref: e.id, text: [e.title, e.company].filter(Boolean).join(" — ") });
    for (const b of e.bullets) chunks.push({ section: "experience", ref: e.id, text: b });
  }
  for (const p of cv.projects) {
    chunks.push({ section: "projects", ref: p.id, text: [p.name, p.description, p.technologies.join(", ")].filter(Boolean).join(" — ") });
  }
  for (const ed of cv.education) {
    chunks.push({ section: "education", ref: ed.id, text: [ed.degree, ed.institution, ed.details].filter(Boolean).join(" — ") });
  }
  if (cv.skills.length) chunks.push({ section: "skills", ref: null, text: cv.skills.join(", ") });
  for (const l of cv.languages) chunks.push({ section: "languages", ref: null, text: `${l.name}${l.level ? ` — ${l.level}` : ""}` });
  for (const c of cv.certifications) chunks.push({ section: "certifications", ref: null, text: c });
  return chunks.filter((c) => c.text.trim());
}

function quote(text: string) {
  return text.length > 220 ? `${text.slice(0, 219)}…` : text;
}

// ---------- dates & years of experience ----------

const MONTHS: Record<string, number> = {
  jan: 0, ene: 0, fev: 1, feb: 1, mar: 2, abr: 3, apr: 3, mai: 4, may: 4, jun: 5, jul: 6, ago: 7, aug: 7,
  set: 8, sep: 8, out: 9, oct: 9, nov: 10, dez: 11, dic: 11, dec: 11,
};
const PRESENT = /present|presente|atual|actual|current|now|hoje|hoy|today|actualidad/i;

export function parseDate(value: string, now = new Date()): Date | null {
  if (!value) return null;
  if (PRESENT.test(value)) return now;
  const n = normalize(value);
  const year = n.match(/(19|20)\d{2}/)?.[0];
  if (!year) return null;
  const monthWord = n.match(/[a-z]{3}/)?.[0];
  let month = monthWord && monthWord in MONTHS ? MONTHS[monthWord] : NaN;
  if (Number.isNaN(month)) {
    const numeric = n.match(/(\d{1,2})[/.-](19|20)\d{2}/);
    month = numeric ? Math.min(11, Math.max(0, Number(numeric[1]) - 1)) : 0;
  }
  return new Date(Date.UTC(Number(year), month, 1));
}

/** Total years across experiences, merging overlapping periods. Returns null if no entry has parseable dates. */
export function yearsOfExperience(experiences: CvData["experiences"], now = new Date()): number | null {
  const ranges: [number, number][] = [];
  for (const e of experiences) {
    const s = parseDate(e.start, now);
    const end = parseDate(e.end, now);
    if (s && end && end >= s) ranges.push([s.getTime(), end.getTime()]);
  }
  if (!ranges.length) return null;
  ranges.sort((a, b) => a[0] - b[0]);
  let total = 0;
  let [cs, ce] = ranges[0];
  for (const [s, e] of ranges.slice(1)) {
    if (s <= ce) ce = Math.max(ce, e);
    else {
      total += ce - cs;
      [cs, ce] = [s, e];
    }
  }
  total += ce - cs;
  return Math.round((total / (365.25 * 24 * 3600 * 1000)) * 10) / 10;
}

// ---------- language levels ----------

const LEVEL_RANK: [RegExp, number][] = [
  [/\bc2\b|native|nativo|materna|bilingu|bilingue/, 6],
  [/\bc1\b|fluent|fluente|fluido|proficient/, 5],
  [/\bb2\b|advanced|avancado|avanzado|upper/, 4],
  [/\bb1\b|intermediate|intermediario|intermedio|professional working|business/, 3],
  [/\ba2\b|basic|basico|elementary/, 2],
  [/\ba1\b|beginner|iniciante|principiante/, 1],
];

export function languageRank(level: string | null | undefined): number | null {
  if (!level) return null;
  const n = normalize(level);
  for (const [re, rank] of LEVEL_RANK) if (re.test(n)) return rank;
  return null;
}

// ---------- matching ----------

function skillEvidence(chunks: Chunk[], skillId: string): Chunk[] {
  const skill = getSkill(skillId);
  if (!skill) return [];
  return chunks.filter((c) => mentionsSkill(c.text, skill));
}

function toEvidence(chunks: Chunk[]): Evidence[] {
  // Prefer contextual evidence (experience/projects) over a bare skills list.
  const order: Evidence["section"][] = ["experience", "projects", "summary", "certifications", "education", "headline", "languages", "skills"];
  return [...chunks]
    .sort((a, b) => order.indexOf(a.section) - order.indexOf(b.section))
    .slice(0, 3)
    .map((c) => ({ section: c.section, ref: c.ref, quote: quote(c.text) }));
}

function matchSkill(req: Requirement, cv: CvData, chunks: Chunk[]): MatchResult {
  const notes: NoteCode[] = [];
  const hitsPerSkill = req.skillIds.map((id) => ({ id, hits: skillEvidence(chunks, id) }));
  const matched = hitsPerSkill.filter((h) => h.hits.length > 0);
  const allHits = matched.flatMap((h) => h.hits);
  const satisfied = req.anyOf ? matched.length > 0 : matched.length === req.skillIds.length;

  if (satisfied) {
    let status: MatchStatus = "found";
    if (allHits.every((h) => h.section === "skills")) notes.push("listed_without_context");
    if (req.minYears) {
      const skillExperiences = cv.experiences.filter((e) =>
        matched.some((m) => m.hits.some((h) => h.section === "experience" && h.ref === e.id)),
      );
      const skillYears = yearsOfExperience(skillExperiences);
      if (skillYears === null) {
        notes.push("years_unverified");
        status = "partial";
      } else if (skillYears < req.minYears) {
        notes.push("years_below_required");
        status = "partial";
      }
    }
    return { requirementId: req.id, status, evidence: toEvidence(allHits), notes, relatedSkills: [] };
  }

  // Related skills give partial evidence (e.g. Vue for a React requirement).
  const relatedIds = req.skillIds.flatMap((id) => getSkill(id)?.related ?? []).filter((id) => !req.skillIds.includes(id));
  const relatedHits = relatedIds.map((id) => ({ id, hits: skillEvidence(chunks, id) })).filter((r) => r.hits.length);
  if (relatedHits.length || matched.length) {
    return {
      requirementId: req.id,
      status: "partial",
      evidence: toEvidence([...allHits, ...relatedHits.flatMap((r) => r.hits)]),
      notes: relatedHits.length ? ["related_skill"] : [],
      relatedSkills: relatedHits.map((r) => getSkill(r.id)!.label),
    };
  }
  return { requirementId: req.id, status: "not_found", evidence: [], notes: ["not_in_document"], relatedSkills: [] };
}

function matchLanguage(req: Requirement, cv: CvData, chunks: Chunk[]): MatchResult {
  const skill = getSkill(req.skillIds[0]);
  const listed = cv.languages.find((l) => skill && mentionsSkill(l.name, skill));
  const hits = skill ? skillEvidence(chunks, skill.id) : [];
  if (!listed && !hits.length) {
    return { requirementId: req.id, status: "not_found", evidence: [], notes: ["not_in_document"], relatedSkills: [] };
  }
  const required = languageRank(req.minLevel);
  const has = languageRank(listed?.level ?? hits.map((h) => h.text).join(" "));
  const notes: NoteCode[] = [];
  let status: MatchStatus = "found";
  if (required !== null) {
    if (has === null) {
      notes.push("level_unverified");
      status = "partial";
    } else if (has < required) {
      notes.push("level_below_required");
      status = "partial";
    }
  }
  return { requirementId: req.id, status, evidence: toEvidence(hits), notes, relatedSkills: [] };
}

function matchEducation(req: Requirement, cv: CvData, chunks: Chunk[]): MatchResult {
  const edu = chunks.filter((c) => c.section === "education" || c.section === "certifications");
  if (!cv.education.length) {
    return { requirementId: req.id, status: "not_found", evidence: [], notes: ["not_in_document"], relatedSkills: [] };
  }
  const reqTokens = tokenize(req.sourceText).filter((t) => !/degree|bachelor|master|graduacao|licenciatura|grado|titulo|formacao|formacion|university|universidade|universidad|related|relacionada|area|field|similar|equivalent|equivalente|afines|afim/.test(t));
  const best = edu
    .map((c) => ({ c, score: reqTokens.length ? reqTokens.filter((t) => containsTerm(normalize(c.text), t)).length / reqTokens.length : 0 }))
    .sort((a, b) => b.score - a.score)[0];
  if (best && (best.score >= 0.34 || reqTokens.length === 0)) {
    return { requirementId: req.id, status: "found", evidence: toEvidence([best.c]), notes: [], relatedSkills: [] };
  }
  return { requirementId: req.id, status: "partial", evidence: toEvidence(edu.slice(0, 2)), notes: ["field_unclear"], relatedSkills: [] };
}

function matchExperienceYears(req: Requirement, cv: CvData, years: number | null): MatchResult {
  const evidence = cv.experiences.slice(0, 3).map((e) => ({
    section: "experience" as const,
    ref: e.id,
    quote: quote(`${e.title}${e.company ? ` — ${e.company}` : ""} (${e.start || "?"} – ${e.end || "?"})`),
  }));
  if (!req.minYears) return { requirementId: req.id, status: "ambiguous", evidence, notes: ["ambiguous_requirement"], relatedSkills: [] };
  if (years === null) {
    return { requirementId: req.id, status: cv.experiences.length ? "partial" : "not_found", evidence, notes: [cv.experiences.length ? "years_unverified" : "not_in_document"], relatedSkills: [] };
  }
  if (years >= req.minYears) return { requirementId: req.id, status: "found", evidence, notes: [], relatedSkills: [] };
  return { requirementId: req.id, status: years > 0 ? "partial" : "not_found", evidence, notes: ["years_below_required"], relatedSkills: [] };
}

function matchByOverlap(req: Requirement, chunks: Chunk[], soft: boolean): MatchResult {
  const reqTokens = tokenize(req.sourceText);
  const scored = chunks
    .map((c) => ({ c, score: jaccard(reqTokens, tokenize(c.text)), coverage: reqTokens.length ? reqTokens.filter((t) => containsTerm(normalize(c.text), t)).length / reqTokens.length : 0 }))
    .sort((a, b) => b.coverage - a.coverage);
  const best = scored[0];
  if (best && best.coverage >= 0.5) {
    return {
      requirementId: req.id,
      status: "partial",
      evidence: toEvidence(scored.filter((s) => s.coverage >= 0.5).map((s) => s.c)),
      notes: soft ? ["soft_skill_needs_example"] : [],
      relatedSkills: [],
    };
  }
  // Generic statements (e.g. "fast-paced environment") cannot be proven or disproven from a CV.
  return { requirementId: req.id, status: "ambiguous", evidence: [], notes: [soft ? "soft_skill_needs_example" : "ambiguous_requirement"], relatedSkills: [] };
}

export function matchRequirements(cv: CvData, requirements: Requirement[], now = new Date()): MatchResult[] {
  const chunks = cvChunks(cv);
  const years = yearsOfExperience(cv.experiences, now);
  return requirements.map((req) => {
    switch (req.category) {
      case "skill":
        return matchSkill(req, cv, chunks);
      case "language":
        return req.skillIds.length ? matchLanguage(req, cv, chunks) : matchByOverlap(req, chunks, false);
      case "education":
        return matchEducation(req, cv, chunks);
      case "experience":
        return matchExperienceYears(req, cv, years);
      case "soft":
        if (req.skillIds.length) {
          const hits = req.skillIds.flatMap((id) => skillEvidence(chunks, id));
          if (hits.length) return { requirementId: req.id, status: "partial", evidence: toEvidence(hits), notes: ["soft_skill_needs_example"], relatedSkills: [] };
        }
        return matchByOverlap(req, chunks, true);
      default:
        return matchByOverlap(req, chunks, false);
    }
  });
}

// ---------- score ----------

export const SCORE_WEIGHTS = { must: 3, nice: 1 } as const;
export const STATUS_VALUES: Record<Exclude<MatchStatus, "ambiguous">, number> = { found: 1, partial: 0.5, not_found: 0 };

export interface ScoreBreakdown {
  score: number | null;
  counts: Record<MatchStatus, number>;
  mustTotal: number;
  mustFound: number;
  scoredRequirements: number;
}

/**
 * Compatibility index (0–100). Weighted average over scorable requirements:
 * must-have weight 3, nice-to-have weight 1; found = 1, partial = 0.5, not identified = 0.
 * Ambiguous requirements are excluded. This is a tool estimate, not a hiring probability.
 */
export function computeScore(requirements: Requirement[], results: MatchResult[]): ScoreBreakdown {
  const byId = new Map(requirements.map((r) => [r.id, r]));
  const counts: Record<MatchStatus, number> = { found: 0, partial: 0, not_found: 0, ambiguous: 0 };
  let num = 0;
  let den = 0;
  let mustTotal = 0;
  let mustFound = 0;
  for (const r of results) {
    counts[r.status]++;
    const req = byId.get(r.requirementId);
    if (!req || r.status === "ambiguous") continue;
    const w = SCORE_WEIGHTS[req.importance];
    num += w * STATUS_VALUES[r.status];
    den += w;
    if (req.importance === "must") {
      mustTotal++;
      if (r.status === "found") mustFound++;
    }
  }
  return {
    score: den > 0 ? Math.round((num / den) * 100) : null,
    counts,
    mustTotal,
    mustFound,
    scoredRequirements: results.length - counts.ambiguous,
  };
}
