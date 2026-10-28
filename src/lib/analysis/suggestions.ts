import { z } from "zod";
import { cvDataSchema, cvToPlainText, type CvData, type CvLanguage } from "@/lib/cv/schema";
import { checkFacts } from "@/lib/ai/factGuard";
import type { MatchResult } from "./match";
import { yearsOfExperience } from "./match";
import type { Requirement } from "./requirements";
import { findSkills, getSkill, mentionsSkill, skillTerms } from "./taxonomy";
import { containsTerm, normalize } from "./text";

export const SUGGESTION_KINDS = [
  "summary",
  "skills_order",
  "skills_add",
  "bullet_rewrite",
  "bullets_order",
  "projects_order",
  "confirm",
  "gap_answer",
] as const;
export type SuggestionKind = (typeof SUGGESTION_KINDS)[number];

export const suggestionDraftSchema = z.object({
  kind: z.enum(SUGGESTION_KINDS),
  section: z.enum(["summary", "skills", "experience", "projects", "general"]),
  targetRef: z
    .object({
      experienceId: z.string().optional(),
      bulletIndex: z.number().int().min(0).optional(),
      projectId: z.string().optional(),
      skill: z.string().optional(),
    })
    .nullable()
    .default(null),
  original: z.string().max(6000).default(""),
  suggested: z.string().max(6000).default(""),
  rationale: z.string().max(1000).default(""),
  requiresConfirmation: z.boolean().default(false),
  flags: z.array(z.string()).default([]),
});
export type SuggestionDraft = z.infer<typeof suggestionDraftSchema>;

/** Kinds that only give advice and never modify the CV. */
export const ADVISORY_KINDS: SuggestionKind[] = ["gap_answer"];

const PLACEHOLDER = /\[[^\]]*\]|_{3,}/;

// ---------- localized templates ----------

const T = {
  en: {
    summary: (title: string, years: string, skills: string, langs: string) =>
      [`${title}${years ? ` with ${years} years of professional experience` : ""}${skills ? `, working with ${skills}` : ""}.`, langs ? `Languages: ${langs}.` : ""].filter(Boolean).join(" "),
    rSummary: "Summary rebuilt only from facts already in your CV, leading with what this job asks for.",
    rSkillsOrder: "Skills requested by the job moved to the top. Nothing was added or removed.",
    rSkillsAdd: (s: string) => `${s} appears in your experience or projects but is missing from your skills list.`,
    rBullet: "Clearer wording with the job's terminology. Meaning and facts unchanged.",
    rBulletsOrder: "Bullets with evidence for this job moved first.",
    rProjects: "Projects most relevant to this job moved first.",
    confirm: (label: string) => `The job asks for ${label}, which is not identified in your CV. If you really have this experience, describe where and how you used it (project, role, period). Leave it out otherwise.`,
    confirmMetric: "Only if you have a real, verifiable result: add it here (e.g. what changed and by how much). Do not estimate.",
    gapRelated: (label: string, rel: string) => `You don't show ${label} directly, but you have ${rel}. In a cover letter or interview you can honestly say you have worked with ${rel} and explain how that transfers to ${label}.`,
    gapYears: (label: string) => `Your CV does not clearly show the years of experience requested for ${label}. Make sure dates in your experience are complete, or explain your actual exposure honestly.`,
    gapLevel: (label: string) => `The job asks for a specific ${label} level. State your real level (e.g. CEFR B2/C1) or certificate if you have one.`,
  },
  pt: {
    summary: (title: string, years: string, skills: string, langs: string) =>
      [`${title}${years ? ` com ${years} anos de experiência profissional` : ""}${skills ? `, atuando com ${skills}` : ""}.`, langs ? `Idiomas: ${langs}.` : ""].filter(Boolean).join(" "),
    rSummary: "Resumo reescrito apenas com fatos que já estão no seu currículo, destacando o que a vaga pede.",
    rSkillsOrder: "Competências pedidas pela vaga foram para o topo. Nada foi adicionado ou removido.",
    rSkillsAdd: (s: string) => `${s} aparece nas suas experiências ou projetos, mas não está na lista de competências.`,
    rBullet: "Redação mais clara, com a terminologia da vaga. Sentido e fatos inalterados.",
    rBulletsOrder: "Itens com evidência para esta vaga foram colocados primeiro.",
    rProjects: "Projetos mais relevantes para a vaga foram colocados primeiro.",
    confirm: (label: string) => `A vaga pede ${label}, que não foi identificado no seu currículo. Se você realmente tem essa experiência, descreva onde e como usou (projeto, cargo, período). Caso contrário, não inclua.`,
    confirmMetric: "Somente se você tiver um resultado real e verificável: inclua aqui (o que mudou e quanto). Não estime.",
    gapRelated: (label: string, rel: string) => `Você não mostra ${label} diretamente, mas tem ${rel}. Na carta ou entrevista, diga com honestidade que trabalhou com ${rel} e explique como isso se aplica a ${label}.`,
    gapYears: (label: string) => `Seu currículo não mostra claramente os anos de experiência pedidos para ${label}. Confira se as datas estão completas ou explique sua exposição real com honestidade.`,
    gapLevel: (label: string) => `A vaga pede um nível específico de ${label}. Informe seu nível real (ex.: QECR B2/C1) ou certificado, se tiver.`,
  },
  es: {
    summary: (title: string, years: string, skills: string, langs: string) =>
      [`${title}${years ? ` con ${years} años de experiencia profesional` : ""}${skills ? `, trabajando con ${skills}` : ""}.`, langs ? `Idiomas: ${langs}.` : ""].filter(Boolean).join(" "),
    rSummary: "Resumen reescrito solo con datos que ya están en tu currículum, destacando lo que pide la oferta.",
    rSkillsOrder: "Las competencias que pide la oferta pasan arriba. No se añadió ni eliminó nada.",
    rSkillsAdd: (s: string) => `${s} aparece en tu experiencia o proyectos, pero falta en tu lista de competencias.`,
    rBullet: "Redacción más clara con la terminología de la oferta. Sentido y datos sin cambios.",
    rBulletsOrder: "Los puntos con evidencia para esta oferta pasan primero.",
    rProjects: "Los proyectos más relevantes para la oferta pasan primero.",
    confirm: (label: string) => `La oferta pide ${label}, que no se identifica en tu currículum. Si de verdad tienes esa experiencia, describe dónde y cómo la usaste (proyecto, puesto, periodo). Si no, no la incluyas.`,
    confirmMetric: "Solo si tienes un resultado real y verificable: añádelo aquí (qué cambió y cuánto). No estimes.",
    gapRelated: (label: string, rel: string) => `No muestras ${label} directamente, pero tienes ${rel}. En la carta o entrevista puedes decir con honestidad que has trabajado con ${rel} y explicar cómo se aplica a ${label}.`,
    gapYears: (label: string) => `Tu currículum no muestra claramente los años de experiencia pedidos para ${label}. Revisa que las fechas estén completas o explica tu experiencia real con honestidad.`,
    gapLevel: (label: string) => `La oferta pide un nivel concreto de ${label}. Indica tu nivel real (p. ej. MCER B2/C1) o certificado si lo tienes.`,
  },
} satisfies Record<CvLanguage, unknown>;

// ---------- bullet clarity rules (meaning-preserving only) ----------

const WEAK_OPENERS: [RegExp, string][] = [
  [/^responsible for the development of\s+/i, "Development of "],
  [/^responsible for\s+/i, ""],
  [/^respons[aá]vel pelo desenvolvimento d[eoa]s?\s+/i, "Desenvolvimento de "],
  [/^respons[aá]vel por\s+/i, ""],
  [/^encargad[oa] del desarrollo de\s+/i, "Desarrollo de "],
  [/^encargad[oa] de\s+/i, ""],
  [/^responsable de\s+/i, ""],
];

function capitalize(s: string) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

/** Replaces skill aliases in a bullet with the label used by the job ad (e.g. "reactjs" -> "React"). */
function alignTerminology(text: string, jobSkillIds: string[]): string {
  let out = text;
  for (const id of jobSkillIds) {
    const skill = getSkill(id);
    if (!skill || skill.category === "spoken") continue;
    for (const alias of skill.aliases) {
      if (normalize(alias) === normalize(skill.label) || alias.length < 3) continue;
      const re = new RegExp(`(^|[^\\w+#.])(${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})(?=$|[^\\w+#])`, "gi");
      // Only rename obvious spelling variants of the same technology (e.g. reactjs/react.js), not sub-products.
      if (normalize(alias).replace(/[.\s-]/g, "").startsWith(normalize(skill.label).replace(/[.\s-]/g, ""))) {
        out = out.replace(re, (_m, pre) => `${pre}${skill.label}`);
      }
    }
  }
  return out;
}

export function improveBullet(bullet: string, jobSkillIds: string[]): string {
  let b = bullet.replace(/\s+/g, " ").trim();
  for (const [re, rep] of WEAK_OPENERS) {
    if (re.test(b)) {
      b = b.replace(re, rep);
      break;
    }
  }
  b = b.replace(/\s*,?\s*(etc\.?|entre outros|entre otros|among others)\s*\.?$/i, "");
  b = alignTerminology(b, jobSkillIds);
  b = capitalize(b).replace(/\s*\.$/, "");
  return b;
}

// ---------- generator ----------

export interface SuggestionInput {
  cv: CvData;
  requirements: Requirement[];
  results: MatchResult[];
  language: CvLanguage;
  jobText: string;
}

function relevanceScore(text: string, jobSkillIds: string[]): number {
  return jobSkillIds.reduce((acc, id) => {
    const s = getSkill(id);
    return acc + (s && mentionsSkill(text, s) ? 1 : 0);
  }, 0);
}

function sameOrder(a: string[], b: string[]) {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

export function generateHeuristicSuggestions(input: SuggestionInput): SuggestionDraft[] {
  const { cv, requirements, results, language } = input;
  const t = T[language];
  const out: SuggestionDraft[] = [];
  const resultById = new Map(results.map((r) => [r.requirementId, r]));
  const ordered = [...requirements].sort((a, b) => (a.importance === b.importance ? 0 : a.importance === "must" ? -1 : 1));
  const jobSkillIds = ordered.flatMap((r) => r.skillIds);
  const cvText = cvToPlainText(cv);

  // 1. Summary from verified facts only.
  const foundSkills: string[] = [];
  for (const req of ordered) {
    const res = resultById.get(req.id);
    if (res?.status !== "found" || req.category !== "skill") continue;
    for (const id of req.skillIds) {
      const s = getSkill(id);
      if (s && mentionsSkill(cvText, s) && !foundSkills.includes(s.label)) foundSkills.push(s.label);
    }
  }
  const title = cv.contact.headline || cv.experiences[0]?.title || "";
  if (title) {
    const years = yearsOfExperience(cv.experiences);
    const yearsText = years !== null && years >= 1 ? String(Math.floor(years)) : "";
    const langs = cv.languages.map((l) => (l.level ? `${l.name} (${l.level})` : l.name)).join(", ");
    const skillsText = foundSkills.slice(0, 6).join(", ");
    const summary = t.summary(title, yearsText, skillsText, langs);
    if (normalize(summary) !== normalize(cv.summary)) {
      out.push({
        kind: "summary",
        section: "summary",
        targetRef: null,
        original: cv.summary,
        suggested: summary,
        rationale: t.rSummary,
        requiresConfirmation: false,
        flags: yearsText ? ["years_computed_from_dates"] : [],
      });
    }
  }

  // 2. Skills: add skills evidenced elsewhere in the CV, then reorder by job relevance.
  const listed = new Set(cv.skills.map(normalize));
  const evidencedNotListed = findSkills(cvText)
    .filter((s) => jobSkillIds.includes(s.id) && s.category !== "spoken" && s.category !== "soft")
    .filter((s) => !cv.skills.some((k) => skillTerms(s).includes(normalize(k))) && !listed.has(normalize(s.label)));
  for (const s of evidencedNotListed) {
    out.push({
      kind: "skills_add",
      section: "skills",
      targetRef: { skill: s.label },
      original: "",
      suggested: s.label,
      rationale: t.rSkillsAdd(s.label),
      requiresConfirmation: false,
      flags: [],
    });
  }
  const rank = (skill: string) => {
    const idx = jobSkillIds.findIndex((id) => {
      const s = getSkill(id);
      return s ? skillTerms(s).some((term) => containsTerm(normalize(skill), term)) : false;
    });
    return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
  };
  const reordered = cv.skills.map((s, i) => ({ s, i, r: rank(s) })).sort((a, b) => a.r - b.r || a.i - b.i).map((x) => x.s);
  if (!sameOrder(reordered, cv.skills)) {
    out.push({
      kind: "skills_order",
      section: "skills",
      targetRef: null,
      original: cv.skills.join(", "),
      suggested: reordered.join(", "),
      rationale: t.rSkillsOrder,
      requiresConfirmation: false,
      flags: [],
    });
  }

  // 3. Experiences: clarity rewrites and bullet order.
  for (const exp of cv.experiences) {
    exp.bullets.forEach((bullet, bulletIndex) => {
      const improved = improveBullet(bullet, jobSkillIds);
      if (improved && improved !== bullet.trim().replace(/\s*\.$/, "")) {
        out.push({
          kind: "bullet_rewrite",
          section: "experience",
          targetRef: { experienceId: exp.id, bulletIndex },
          original: bullet,
          suggested: improved,
          rationale: t.rBullet,
          requiresConfirmation: false,
          flags: [],
        });
      }
    });
    const scored = exp.bullets.map((b, i) => ({ b, i, s: relevanceScore(b, jobSkillIds) }));
    const sorted = [...scored].sort((a, b) => b.s - a.s || a.i - b.i).map((x) => x.b);
    if (!sameOrder(sorted, exp.bullets)) {
      out.push({
        kind: "bullets_order",
        section: "experience",
        targetRef: { experienceId: exp.id },
        original: exp.bullets.join("\n"),
        suggested: sorted.join("\n"),
        rationale: t.rBulletsOrder,
        requiresConfirmation: false,
        flags: [],
      });
    }
  }

  // 4. Projects order.
  if (cv.projects.length > 1) {
    const sortedProjects = cv.projects
      .map((p, i) => ({ p, i, s: relevanceScore(`${p.name} ${p.description} ${p.technologies.join(" ")}`, jobSkillIds) }))
      .sort((a, b) => b.s - a.s || a.i - b.i)
      .map((x) => x.p);
    if (!sameOrder(sortedProjects.map((p) => p.id), cv.projects.map((p) => p.id))) {
      out.push({
        kind: "projects_order",
        section: "projects",
        targetRef: null,
        original: cv.projects.map((p) => p.name).join("\n"),
        suggested: sortedProjects.map((p) => p.name).join("\n"),
        rationale: t.rProjects,
        requiresConfirmation: false,
        flags: [`order:${sortedProjects.map((p) => p.id).join(",")}`],
      });
    }
  }

  // 5. Requirements not proven: things to confirm, and honest answers for gaps.
  for (const req of ordered) {
    const res = resultById.get(req.id);
    if (!res) continue;
    if (res.status === "not_found" && (req.category === "skill" || req.category === "language")) {
      out.push({
        kind: "confirm",
        section: "skills",
        targetRef: { skill: req.label },
        original: "",
        suggested: "",
        rationale: t.confirm(req.label),
        requiresConfirmation: true,
        flags: [req.importance === "must" ? "must_have" : "nice_to_have"],
      });
    } else if (res.status === "partial") {
      let advice = "";
      if (res.relatedSkills.length) advice = t.gapRelated(req.label, res.relatedSkills.join(", "));
      else if (res.notes.includes("years_below_required") || res.notes.includes("years_unverified")) advice = t.gapYears(req.label);
      else if (res.notes.includes("level_below_required") || res.notes.includes("level_unverified")) advice = t.gapLevel(req.label);
      if (advice) {
        out.push({ kind: "gap_answer", section: "general", targetRef: { skill: req.label }, original: "", suggested: advice, rationale: "", requiresConfirmation: false, flags: [] });
      }
    }
  }

  return out;
}

/**
 * Final safety net for every suggestion (heuristic or LLM): anything that adds
 * numbers or technologies not present in the CV is discarded. Returns kept + dropped count.
 */
export function guardSuggestions(
  drafts: SuggestionDraft[],
  cv: CvData,
  opts: { allowedNumbers?: string[]; jobText?: string } = {},
): { kept: SuggestionDraft[]; dropped: number } {
  const source = cvToPlainText(cv);
  const kept: SuggestionDraft[] = [];
  let dropped = 0;
  for (const d of drafts) {
    if (d.kind === "confirm" || d.kind === "gap_answer") {
      kept.push(d); // advice/confirmation text is never auto-inserted into the CV
      continue;
    }
    const check = checkFacts(d.suggested, source, { allowedNumbers: opts.allowedNumbers, allowedText: opts.jobText });
    if (!check.ok) {
      dropped++;
      continue;
    }
    kept.push(check.newEntities.length ? { ...d, flags: [...d.flags, "check_names"] } : d);
  }
  return { kept, dropped };
}

/** Numbers that are legitimately derived from the CV (e.g. total years computed from dates). */
export function derivedNumbers(cv: CvData): string[] {
  const years = yearsOfExperience(cv.experiences);
  return years !== null ? [String(Math.floor(years)), String(years)] : [];
}

// ---------- applying accepted suggestions ----------

export interface AppliedSuggestion {
  kind: SuggestionKind;
  targetRef: SuggestionDraft["targetRef"];
  text: string; // final text (suggested or user-edited)
  flags: string[];
  confirmedByUser: boolean;
}

export class ApplyError extends Error {
  constructor(public code: "placeholder_left" | "confirmation_required" | "invalid_target") {
    super(code);
  }
}

/**
 * Produces a NEW CV from accepted suggestions. The input is never mutated, so
 * the original version stays intact (versions are immutable in the database too).
 */
export function applySuggestions(cv: CvData, accepted: AppliedSuggestion[]): CvData {
  const next: CvData = structuredClone(cv);
  // Bullet rewrites must run before bullet reordering so indices stay valid.
  const order: SuggestionKind[] = ["summary", "bullet_rewrite", "bullets_order", "skills_add", "confirm", "skills_order", "projects_order"];
  const sorted = [...accepted].sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));

  for (const s of sorted) {
    if (ADVISORY_KINDS.includes(s.kind)) continue;
    if (PLACEHOLDER.test(s.text)) throw new ApplyError("placeholder_left");
    switch (s.kind) {
      case "summary":
        next.summary = s.text.trim();
        break;
      case "bullet_rewrite": {
        const exp = next.experiences.find((e) => e.id === s.targetRef?.experienceId);
        const idx = s.targetRef?.bulletIndex;
        if (!exp || idx === undefined || idx >= exp.bullets.length) throw new ApplyError("invalid_target");
        exp.bullets[idx] = s.text.trim();
        break;
      }
      case "bullets_order": {
        const exp = next.experiences.find((e) => e.id === s.targetRef?.experienceId);
        if (!exp) throw new ApplyError("invalid_target");
        const lines = s.text.split("\n").map((l) => l.trim()).filter(Boolean);
        // Only accept a pure reordering of the current bullets (after rewrites).
        const current = new Set(exp.bullets.map(normalize));
        if (lines.length === exp.bullets.length && lines.every((l) => current.has(normalize(l)))) exp.bullets = lines;
        break;
      }
      case "skills_add":
      case "confirm": {
        if (s.kind === "confirm" && !s.confirmedByUser) throw new ApplyError("confirmation_required");
        const skill = (s.kind === "confirm" ? s.targetRef?.skill : s.text)?.trim();
        if (skill && !next.skills.some((k) => normalize(k) === normalize(skill))) next.skills.push(skill);
        if (s.kind === "confirm" && s.text.trim()) {
          // The user's own confirmed description is appended to the summary only if they wrote one.
          next.summary = [next.summary, s.text.trim()].filter(Boolean).join(" ");
        }
        break;
      }
      case "skills_order": {
        const items = s.text.split(",").map((x) => x.trim()).filter(Boolean);
        const current = new Set(next.skills.map(normalize));
        const reordered = items.filter((i) => current.has(normalize(i)));
        const rest = next.skills.filter((k) => !reordered.some((r) => normalize(r) === normalize(k)));
        next.skills = [...reordered, ...rest];
        break;
      }
      case "projects_order": {
        const flag = s.flags.find((f) => f.startsWith("order:"));
        if (!flag) break;
        const ids = flag.slice(6).split(",");
        const byId = new Map(next.projects.map((p) => [p.id, p]));
        const reordered = ids.map((id) => byId.get(id)).filter((p): p is NonNullable<typeof p> => Boolean(p));
        if (reordered.length === next.projects.length) next.projects = reordered;
        break;
      }
    }
  }
  return cvDataSchema.parse(next);
}
