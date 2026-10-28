import type { CvLanguage } from "@/lib/cv/schema";

export const TEMPLATES = ["classic", "modern"] as const;
export type CvTemplate = (typeof TEMPLATES)[number];

export const SECTION_LABELS: Record<CvLanguage, Record<"summary" | "experience" | "education" | "skills" | "projects" | "languages" | "certifications", string>> = {
  en: { summary: "Professional summary", experience: "Experience", education: "Education", skills: "Skills", projects: "Projects", languages: "Languages", certifications: "Certifications" },
  pt: { summary: "Resumo profissional", experience: "Experiência profissional", education: "Formação", skills: "Competências", projects: "Projetos", languages: "Idiomas", certifications: "Certificações" },
  es: { summary: "Perfil profesional", experience: "Experiencia profesional", education: "Formación", skills: "Competencias", projects: "Proyectos", languages: "Idiomas", certifications: "Certificaciones" },
};

export function dateRange(start: string, end: string) {
  return [start, end].filter(Boolean).join(" – ");
}
