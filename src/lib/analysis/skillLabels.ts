import type { CvLanguage } from "@/lib/cv/schema";

/** Spoken languages and soft skills have an English label in the taxonomy. Technology names stay as they are. */
const LABELS: Record<string, { pt: string; es: string }> = {
  English: { pt: "Inglês", es: "Inglés" },
  Spanish: { pt: "Espanhol", es: "Español" },
  Portuguese: { pt: "Português", es: "Portugués" },
  French: { pt: "Francês", es: "Francés" },
  German: { pt: "Alemão", es: "Alemán" },
  Catalan: { pt: "Catalão", es: "Catalán" },
  Italian: { pt: "Italiano", es: "Italiano" },
  Dutch: { pt: "Holandês", es: "Neerlandés" },
  Chinese: { pt: "Chinês", es: "Chino" },
  Japanese: { pt: "Japonês", es: "Japonés" },
  Russian: { pt: "Russo", es: "Ruso" },
  Arabic: { pt: "Árabe", es: "Árabe" },
  Communication: { pt: "Comunicação", es: "Comunicación" },
  Leadership: { pt: "Liderança", es: "Liderazgo" },
  "Problem solving": { pt: "Resolução de problemas", es: "Resolución de problemas" },
  Mentoring: { pt: "Mentoria", es: "Mentoría" },
};

/** Requirement labels can join alternatives ("English / Spanish"). Anything else passes through untouched. */
export function localizeSkillLabel(label: string, language: CvLanguage | string): string {
  if (language !== "pt" && language !== "es") return label;
  return label
    .split(" / ")
    .map((part) => LABELS[part]?.[language] ?? part)
    .join(" / ");
}
