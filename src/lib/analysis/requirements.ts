import { z } from "zod";
import { findSkills, getSkill } from "./taxonomy";
import { normalize, splitSentences } from "./text";

export const requirementSchema = z.object({
  id: z.string(),
  label: z.string().max(200),
  sourceText: z.string().max(600),
  category: z.enum(["skill", "language", "education", "experience", "soft", "other"]),
  importance: z.enum(["must", "nice"]),
  skillIds: z.array(z.string()).default([]),
  anyOf: z.boolean().default(false),
  minYears: z.number().min(0).max(40).nullable().default(null),
  minLevel: z.string().max(20).nullable().default(null),
});
export type Requirement = z.infer<typeof requirementSchema>;

type Zone = "must" | "nice" | "responsibilities" | "ignore" | "unknown";

const ZONE_HEADINGS: [Zone, string[]][] = [
  ["nice", ["nice to have", "desejavel", "desejaveis", "diferencial", "diferenciais", "deseable", "deseables", "valorable", "se valorara", "valoraremos", "bonus", "bonus points", "pluses", "preferred qualifications", "plus"]],
  ["must", ["requirements", "requisitos", "required", "requisitos obrigatorios", "must have", "must-have", "imprescindible", "obrigatorio", "qualifications", "what you need", "what we are looking for", "what were looking for", "lo que buscamos", "o que buscamos", "que buscamos", "perfil", "your profile", "seu perfil", "tu perfil", "requisitos minimos", "minimum qualifications", "about you", "sobre voce", "sobre ti", "skills"]],
  ["responsibilities", ["responsibilities", "responsabilidades", "what you will do", "what youll do", "funciones", "atividades", "atribuicoes", "your role", "o que voce vai fazer", "que haras", "tareas", "day to day", "dia a dia"]],
  ["ignore", ["benefits", "beneficios", "what we offer", "we offer", "ofrecemos", "oferecemos", "about us", "sobre nos", "sobre nosotros", "quem somos", "quienes somos", "perks", "salary", "salario", "how to apply", "como aplicar", "como candidatarse"]],
];

function detectZone(line: string): Zone | null {
  const n = normalize(line).replace(/[:!?.\-–—#*]+$/g, "").replace(/^[#*•\s]+/, "").trim();
  if (!n || n.length > 60) return null;
  for (const [zone, words] of ZONE_HEADINGS) {
    if (words.some((w) => n === w || n.startsWith(`${w} `) || n.endsWith(` ${w}`))) return zone;
  }
  return null;
}

const NICE_MARKERS = /\b(nice to have|desejavel|diferencial|deseable|valorable|se valorara|bonus|a plus|is a plus|plus|preferably|preferivel|preferencialmente|preferiblemente|ideally|idealmente)\b/;
const EDUCATION_MARKERS = /\b(degree|bachelor|master|bsc|msc|phd|graduacao|graduado|bacharel|licenciatura|grado|titulacion|titulo|ingenieria|engenharia|formacao|formacion|university|universidade|universidad|diploma|tecnico superior|fp|ciclo formativo)\b/;
const SOFT_MARKERS = /\b(communication|comunicacao|comunicacion|leadership|lideranca|liderazgo|teamwork|trabalho em equipe|trabajo en equipo|proactive|proativo|proactivo|autonomy|autonomia|problem solving|resolucao de problemas|resolucion de problemas|organized|organizado|curious|curioso|collaborat|colabora)\w*/;
const YEARS = /(\d{1,2})\s*\+?\s*(?:\+\s*)?(?:years?|anos?|años?|yrs)/i;
const OR_MARKER = /\b(or|ou|o)\b|\//;
const CEFR = /\b([abc][12])\b/i;
const LEVEL_WORDS = /\b(native|nativo|fluent|fluente|fluido|advanced|avancado|avanzado|intermediate|intermediario|intermedio|basic|basico|professional working|business)\b/;

let counter = 0;
const rid = () => `req_${(++counter).toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

function categorize(line: string, skillIds: string[]): Requirement["category"] {
  const n = normalize(line);
  if (skillIds.length && skillIds.every((id) => getSkill(id)?.category === "spoken")) return "language";
  if (skillIds.length && skillIds.every((id) => getSkill(id)?.category === "soft")) return "soft";
  if (skillIds.length) return "skill";
  if (EDUCATION_MARKERS.test(n)) return "education";
  if (YEARS.test(n)) return "experience";
  if (SOFT_MARKERS.test(n)) return "soft";
  return "other";
}

function levelOf(line: string): string | null {
  const n = normalize(line);
  return n.match(CEFR)?.[1]?.toUpperCase() ?? n.match(LEVEL_WORDS)?.[1] ?? null;
}

function shorten(s: string, max = 140) {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

/**
 * Deterministic requirement extraction from a pasted job description (PT/ES/EN).
 * Requirement lines become requirements; skills found elsewhere become implicit ones.
 */
export function extractRequirements(jobText: string): Requirement[] {
  const lines = jobText.replace(/\r/g, "").split("\n");
  const out: Requirement[] = [];
  const bySkill = new Map<string, Requirement>();
  let zone: Zone = "unknown";
  const hasZones = lines.some((l) => detectZone(l) !== null);

  const addSkillReq = (skillId: string, importance: Requirement["importance"], sourceText: string, minYears: number | null) => {
    const existing = bySkill.get(skillId);
    if (existing) {
      if (importance === "must") existing.importance = "must";
      if (minYears && !existing.minYears) existing.minYears = minYears;
      return;
    }
    const skill = getSkill(skillId)!;
    const req: Requirement = {
      id: rid(),
      label: skill.label,
      sourceText: shorten(sourceText, 600),
      category: skill.category === "spoken" ? "language" : skill.category === "soft" ? "soft" : "skill",
      importance,
      skillIds: [skillId],
      anyOf: false,
      minYears,
      minLevel: skill.category === "spoken" ? levelOf(sourceText) : null,
    };
    bySkill.set(skillId, req);
    out.push(req);
  };

  for (const rawLine of lines) {
    const z = detectZone(rawLine);
    if (z) {
      zone = z;
      continue;
    }
    if (zone === "ignore") continue;
    for (const sentence of splitSentences(rawLine)) {
      const n = normalize(sentence);
      const skills = findSkills(sentence);
      const years = sentence.match(YEARS);
      const minYears = years ? Number(years[1]) : null;
      const niceByMarker = NICE_MARKERS.test(n);

      let importance: Requirement["importance"];
      if (zone === "nice" || niceByMarker) importance = "nice";
      else if (zone === "must") importance = "must";
      else if (zone === "responsibilities") importance = "nice";
      else importance = hasZones ? "nice" : "must";

      const inRequirementZone = zone === "must" || zone === "nice" || !hasZones;

      if (skills.length > 1 && OR_MARKER.test(n) && skills.length <= 4) {
        const ids = skills.map((s) => s.id).filter((id) => !bySkill.has(id));
        if (ids.length >= 2) {
          const req: Requirement = {
            id: rid(),
            label: skills.map((s) => s.label).join(" / "),
            sourceText: shorten(sentence, 600),
            category: categorize(sentence, ids),
            importance,
            skillIds: ids,
            anyOf: true,
            minYears,
            minLevel: null,
          };
          ids.forEach((id) => bySkill.set(id, req));
          out.push(req);
          continue;
        }
      }
      if (skills.length) {
        for (const s of skills) addSkillReq(s.id, importance, sentence, skills.length === 1 ? minYears : null);
        if (skills.length > 1 && minYears && inRequirementZone) {
          out.push({ id: rid(), label: shorten(sentence), sourceText: shorten(sentence, 600), category: "experience", importance, skillIds: [], anyOf: false, minYears, minLevel: null });
        }
        continue;
      }
      if (!inRequirementZone) continue;
      if (sentence.length < 12 || sentence.length > 400) continue;
      const category = categorize(sentence, []);
      out.push({
        id: rid(),
        label: shorten(sentence),
        sourceText: shorten(sentence, 600),
        category,
        importance,
        skillIds: [],
        anyOf: false,
        minYears,
        minLevel: null,
      });
    }
  }

  // Must-haves first, keep a reasonable number for review.
  return out.sort((a, b) => (a.importance === b.importance ? 0 : a.importance === "must" ? -1 : 1)).slice(0, 60);
}
