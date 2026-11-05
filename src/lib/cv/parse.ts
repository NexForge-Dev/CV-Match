import { clampCv, cvDataSchema, newId, type CvData, type Education, type Experience, type Project } from "./schema";
import { normalize } from "@/lib/analysis/text";
import { findSkills } from "@/lib/analysis/taxonomy";

type Section = "summary" | "experience" | "education" | "skills" | "projects" | "languages" | "certifications";

const HEADINGS: Record<Section, string[]> = {
  summary: ["resumo", "resumo profissional", "perfil", "perfil profissional", "sobre mim", "objetivo", "objetivo profissional", "summary", "professional summary", "profile", "about me", "about", "objective", "resumen", "resumen profesional", "perfil profesional", "sobre mi", "extracto"],
  experience: ["experiencia", "experiencias", "experiencia profissional", "experiencias profissionais", "historico profissional", "experience", "work experience", "professional experience", "employment", "employment history", "work history", "experiencia laboral", "experiencia profesional", "trayectoria profesional"],
  education: ["formacao", "formacao academica", "educacao", "escolaridade", "education", "academic background", "formacion", "formacion academica", "educacion", "estudios"],
  skills: ["competencias", "competencias tecnicas", "habilidades", "habilidades tecnicas", "skills", "technical skills", "core skills", "tecnologias", "conhecimentos", "conhecimentos tecnicos", "conocimientos", "tech stack", "stack", "aptitudes"],
  projects: ["projetos", "projetos pessoais", "projects", "personal projects", "side projects", "proyectos", "proyectos personales", "portfolio", "portfolio"],
  languages: ["idiomas", "languages", "linguas", "lenguas"],
  certifications: ["certificacoes", "certificados", "certifications", "certificates", "certificaciones", "cursos", "courses", "cursos e certificacoes", "licenses & certifications", "licencias y certificaciones"],
};

const HEADING_LOOKUP = new Map<string, Section>();
for (const [section, words] of Object.entries(HEADINGS) as [Section, string[]][]) {
  for (const w of words) HEADING_LOOKUP.set(w, section);
}

export function detectHeading(line: string): Section | null {
  const cleaned = normalize(line).replace(/[:\-–—_|•*#]+$/g, "").replace(/^[#*•\s]+/, "").trim();
  if (!cleaned || cleaned.length > 40) return null;
  return HEADING_LOOKUP.get(cleaned) ?? null;
}

const MONTH = "(?:jan|fev|feb|mar|abr|apr|mai|may|jun|jul|ago|aug|set|sep|sept|out|oct|nov|dez|dic|dec|ene)[a-z]*\\.?";
const DATE = `(?:${MONTH}\\s*(?:de\\s*)?)?(?:\\d{1,2}[/.-])?(?:19|20)\\d{2}`;
const PRESENT = "(?:present|presente|atual|atualmente|actual|actualidad|current|now|hoje|hoy|today)";
const DATE_RANGE = new RegExp(`(${DATE})\\s*(?:-|–|—|to|a|ate|até|hasta)\\s*(${DATE}|${PRESENT})`, "i");
const SINGLE_DATE = new RegExp(`(${DATE})`, "i");

export function extractDateRange(line: string): { start: string; end: string; rest: string } | null {
  const m = line.match(DATE_RANGE);
  if (m) {
    return { start: m[1].trim(), end: m[2].trim(), rest: line.replace(m[0], " ").replace(/[()|,·]+\s*$/, "").trim() };
  }
  return null;
}

const BULLET = /^\s*[•\-*·▪●◦–—>]\s*/;
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/;
const PHONE = /(?:\+?\d[\d\s().-]{7,}\d)/;
/** EMAIL and PHONE backtrack quadratically on a long run of matching characters, and no contact line is this long. */
const MAX_CONTACT_LINE = 500;
const LINK = /\b(?:https?:\/\/\S+|(?:www\.)?(?:linkedin\.com|github\.com|gitlab\.com|behance\.net)\/\S+)/gi;

function isBullet(line: string) {
  return BULLET.test(line);
}

function stripBullet(line: string) {
  return line.replace(BULLET, "").trim();
}

function splitHeader(header: string): [string, string] {
  const cleaned = header.replace(/\s+/g, " ").trim();
  const seps = [" | ", " — ", " – ", " - ", " @ ", " at ", " na ", " en ", ", "];
  for (const sep of seps) {
    const idx = cleaned.indexOf(sep);
    if (idx > 0) return [cleaned.slice(0, idx).trim(), cleaned.slice(idx + sep.length).trim()];
  }
  return [cleaned, ""];
}

interface Block {
  header: string[];
  body: string[];
  start: string;
  end: string;
}

/** Groups section lines into entries: header lines followed by bullet/body lines. */
function toBlocks(lines: string[]): Block[] {
  const blocks: Block[] = [];
  let cur: Block | null = null;
  const push = () => {
    if (cur && (cur.header.length || cur.body.length)) blocks.push(cur);
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const range = extractDateRange(line);
    const bullet = isBullet(line);
    const long = line.length > 110;
    if (!bullet && !long) {
      const startsNew = !cur || cur.body.length > 0 || (range !== null && (cur.start !== "" || cur.header.length >= 2));
      if (startsNew) {
        push();
        cur = { header: [], body: [], start: "", end: "" };
      }
      if (range && cur!.start === "") {
        cur!.start = range.start;
        cur!.end = range.end;
        if (range.rest) cur!.header.push(range.rest);
      } else {
        cur!.header.push(line);
      }
    } else {
      if (!cur) cur = { header: [], body: [], start: "", end: "" };
      cur.body.push(stripBullet(line));
    }
  }
  push();
  return blocks;
}

function parseExperiences(lines: string[]): Experience[] {
  return toBlocks(lines).map((b) => {
    const [title, company] = splitHeader(b.header[0] ?? "");
    let location = "";
    let comp = company;
    const extraHeader = b.header.slice(1);
    if (!comp && extraHeader.length) comp = extraHeader.shift()!;
    if (extraHeader.length) location = extraHeader.join(" ");
    return {
      id: newId("exp"),
      title,
      company: comp,
      location,
      start: b.start,
      end: b.end,
      bullets: b.body,
    };
  });
}

function parseEducation(lines: string[]): Education[] {
  return toBlocks(lines).map((b) => {
    const [degree, institution] = splitHeader(b.header[0] ?? "");
    const start = b.start;
    let end = b.end;
    if (!start) {
      const single = (b.header.join(" ") + " " + b.body.join(" ")).match(SINGLE_DATE);
      if (single) end = single[1];
    }
    const inst = institution || b.header[1] || "";
    return { id: newId("edu"), degree, institution: inst, start, end, details: b.body.join(" ") };
  });
}

function parseProjects(lines: string[]): Project[] {
  return toBlocks(lines).map((b) => {
    const [name, maybeDesc] = splitHeader(b.header[0] ?? "");
    const description = [maybeDesc, ...b.header.slice(1), ...b.body].filter(Boolean).join(" ");
    const links = (b.header.join(" ") + " " + b.body.join(" ")).match(LINK) ?? [];
    return {
      id: newId("prj"),
      name,
      description,
      technologies: findSkills(`${name} ${description}`).map((s) => s.label),
      link: links[0] ?? "",
    };
  });
}

export function splitList(lines: string[]): string[] {
  const items: string[] = [];
  for (const line of lines) {
    // "Frontend: React, Vue" -> drop the category label
    const content = line.includes(":") && line.indexOf(":") < 30 ? line.slice(line.indexOf(":") + 1) : line;
    for (const part of content.split(/[,;|•·▪\n]|\s\/\s/)) {
      const item = stripBullet(part).replace(/\.$/, "").trim();
      if (item && item.length <= 60) items.push(item);
    }
  }
  return Array.from(new Map(items.map((i) => [normalize(i), i])).values());
}

function parseLanguages(lines: string[]) {
  return splitList(lines).map((item) => {
    const m = item.match(/^([^\-–:(]+)[\-–:(]\s*([^)]*)\)?$/);
    return m ? { name: m[1].trim(), level: m[2].trim() } : { name: item, level: "" };
  });
}

/**
 * Deterministic CV parser for PT/ES/EN resumes. It never infers facts:
 * every field is copied from the source text. Users review and correct the
 * result before it is saved.
 */
export function parseCvText(text: string): CvData {
  const lines = text.replace(/\r/g, "").split("\n").map((l) => l.trim());
  const sections: Record<Section, string[]> = {
    summary: [], experience: [], education: [], skills: [], projects: [], languages: [], certifications: [],
  };
  const preamble: string[] = [];
  let current: Section | null = null;

  for (const line of lines) {
    const heading = detectHeading(line);
    if (heading) {
      current = heading;
      continue;
    }
    if (current) sections[current].push(line);
    else preamble.push(line);
  }

  // Contact block from the preamble.
  const pre = preamble.filter(Boolean);
  const contactLine = (l: string) => l.slice(0, MAX_CONTACT_LINE);
  const contactLines = pre.map(contactLine);
  const email = contactLines.join(" \n ").match(EMAIL)?.[0] ?? "";
  const phoneMatch = contactLines.map((l) => l.replace(EMAIL, "")).join(" \n ").match(PHONE)?.[0] ?? "";
  const links = Array.from(new Set(text.match(LINK) ?? [])).slice(0, 5);
  const isContactLine = (l: string) => EMAIL.test(contactLine(l)) || PHONE.test(contactLine(l)) || /linkedin|github|http/i.test(l);
  const nonContact = pre.filter((l) => !isContactLine(l));
  const fullName = nonContact[0] && nonContact[0].length <= 60 ? nonContact[0] : "";
  const headline = nonContact[1] && nonContact[1].length <= 90 ? nonContact[1] : "";
  const locationLine = nonContact.slice(2).find((l) => l.length <= 60 && /,/.test(l)) ?? "";
  const leftoverPre = nonContact.slice(2).filter((l) => l !== locationLine && l.length > 60);

  let summary = sections.summary.filter(Boolean).join(" ");
  if (!summary && leftoverPre.length) summary = leftoverPre.join(" ");

  let skills = splitList(sections.skills.filter(Boolean));
  const noSections = Object.values(sections).every((s) => s.filter(Boolean).length === 0);
  if (noSections) {
    // Unstructured text: keep the whole text as summary-free content and detect only explicit skills.
    skills = findSkills(text).map((s) => s.label);
  }

  return cvDataSchema.parse(clampCv({
    contact: {
      fullName,
      headline,
      email,
      phone: phoneMatch.trim(),
      location: locationLine,
      links,
    },
    summary: summary.slice(0, 4000),
    experiences: parseExperiences(sections.experience),
    education: parseEducation(sections.education),
    skills: skills.slice(0, 150),
    projects: parseProjects(sections.projects),
    languages: parseLanguages(sections.languages.filter(Boolean)).slice(0, 15),
    certifications: sections.certifications.map(stripBullet).filter(Boolean).slice(0, 40),
  }));
}
