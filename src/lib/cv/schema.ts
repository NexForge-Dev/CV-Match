import { z } from "zod";

export const CV_LANGUAGES = ["pt", "es", "en"] as const;
export type CvLanguage = (typeof CV_LANGUAGES)[number];
export const cvLanguageSchema = z.enum(CV_LANGUAGES);

const shortText = z.string().trim().max(300);
const longText = z.string().trim().max(4000);

export const contactSchema = z.object({
  fullName: shortText.default(""),
  headline: shortText.default(""),
  email: shortText.default(""),
  phone: shortText.default(""),
  location: shortText.default(""),
  links: z.array(shortText).max(10).default([]),
});

export const experienceSchema = z.object({
  id: z.string().min(1).max(64),
  title: shortText.default(""),
  company: shortText.default(""),
  location: shortText.default(""),
  start: shortText.default(""),
  end: shortText.default(""),
  bullets: z.array(longText).max(30).default([]),
});

export const educationSchema = z.object({
  id: z.string().min(1).max(64),
  degree: shortText.default(""),
  institution: shortText.default(""),
  start: shortText.default(""),
  end: shortText.default(""),
  details: longText.default(""),
});

export const projectSchema = z.object({
  id: z.string().min(1).max(64),
  name: shortText.default(""),
  description: longText.default(""),
  technologies: z.array(shortText).max(30).default([]),
  link: shortText.default(""),
});

export const languageSkillSchema = z.object({
  name: shortText,
  level: shortText.default(""),
});

export const cvDataSchema = z.object({
  contact: contactSchema.default({ fullName: "", headline: "", email: "", phone: "", location: "", links: [] }),
  summary: longText.default(""),
  experiences: z.array(experienceSchema).max(40).default([]),
  education: z.array(educationSchema).max(20).default([]),
  skills: z.array(shortText).max(150).default([]),
  projects: z.array(projectSchema).max(30).default([]),
  languages: z.array(languageSkillSchema).max(15).default([]),
  certifications: z.array(shortText).max(40).default([]),
});

export type CvData = z.infer<typeof cvDataSchema>;
export type Experience = z.infer<typeof experienceSchema>;
export type Education = z.infer<typeof educationSchema>;
export type Project = z.infer<typeof projectSchema>;

export function emptyCv(): CvData {
  return cvDataSchema.parse({});
}

/** Flattens a CV into plain text. Used as the evidence corpus for matching and fact checks. */
export function cvToPlainText(cv: CvData): string {
  const parts: string[] = [];
  const c = cv.contact;
  parts.push([c.fullName, c.headline, c.location].filter(Boolean).join(" — "));
  if (cv.summary) parts.push(cv.summary);
  for (const e of cv.experiences) {
    parts.push([e.title, e.company, e.location, e.start, e.end].filter(Boolean).join(" | "));
    parts.push(...e.bullets);
  }
  for (const ed of cv.education) {
    parts.push([ed.degree, ed.institution, ed.start, ed.end, ed.details].filter(Boolean).join(" | "));
  }
  if (cv.skills.length) parts.push(cv.skills.join(", "));
  for (const p of cv.projects) {
    parts.push([p.name, p.description, p.technologies.join(", ")].filter(Boolean).join(" | "));
  }
  for (const l of cv.languages) parts.push(`${l.name} ${l.level}`.trim());
  parts.push(...cv.certifications);
  return parts.filter(Boolean).join("\n");
}

export function newId(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}
