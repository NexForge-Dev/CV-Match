import { describe, expect, it } from "vitest";
import { extractRequirements } from "@/lib/analysis/requirements";
import { matchRequirements } from "@/lib/analysis/match";
import { generateHeuristicSuggestions } from "@/lib/analysis/suggestions";
import { heuristicCoverLetter, heuristicInterviewPrep } from "@/lib/analysis/extras";
import { localizeSkillLabel } from "@/lib/analysis/skillLabels";
import { parseCvText } from "@/lib/cv/parse";

const CV = `Maria Santos
Desenvolvedora Full Stack
maria@example.com

Experiência
Desenvolvedora Full Stack | Acme Tech
Jan 2018 - Atual
- Desenvolvi APIs em Node.js e telas em React com PostgreSQL.

Competências
React, Node.js, PostgreSQL

Certificações
AWS Certified Cloud Practitioner
`;

const JOB = `Requisitos
React
Node.js
PostgreSQL
AWS
Inglês avançado
Boa comunicação`;

function run() {
  const cv = parseCvText(CV);
  const requirements = extractRequirements(JOB);
  const results = matchRequirements(cv, requirements);
  return { cv, requirements, results };
}

describe("labels in the analysis language (CVM-013)", () => {
  it("translates spoken languages and soft skills, and leaves technology names alone", () => {
    expect(localizeSkillLabel("English", "pt")).toBe("Inglês");
    expect(localizeSkillLabel("Communication", "pt")).toBe("Comunicação");
    expect(localizeSkillLabel("Communication", "es")).toBe("Comunicación");
    expect(localizeSkillLabel("Communication", "en")).toBe("Communication");
    expect(localizeSkillLabel("English / Spanish", "pt")).toBe("Inglês / Espanhol");
    expect(localizeSkillLabel("React", "pt")).toBe("React");
  });

  it("uses them in interview questions and in what the engine asks the user to confirm", () => {
    const { cv, requirements, results } = run();
    const text = JSON.stringify([
      heuristicInterviewPrep({ cv, requirements, results, language: "pt", job: { title: "Dev", company: "" } }),
      generateHeuristicSuggestions({ cv, requirements, results, language: "pt", jobText: JOB }),
    ]);
    expect(text).not.toMatch(/\bEnglish\b|\bCommunication\b/);
    expect(text).toContain("Inglês");
  });
});

describe("claims of use (CVM-014)", () => {
  it("does not say someone works with what they only hold a certificate for", () => {
    const { cv, requirements, results } = run();
    const drafts = generateHeuristicSuggestions({ cv, requirements, results, language: "pt", jobText: JOB });
    const summary = drafts.find((d) => d.kind === "summary");
    expect(summary?.suggested).toContain("React");
    expect(summary?.suggested).not.toContain("AWS");
    expect(drafts.filter((d) => d.kind === "skills_add").map((d) => d.suggested)).not.toContain("AWS");
  });

  it("does not claim practical experience with it in the cover letter either", () => {
    const { cv, requirements, results } = run();
    const letter = heuristicCoverLetter({ cv, requirements, results, language: "pt", job: { title: "Dev", company: "" } });
    expect(letter).toContain("React");
    expect(letter).not.toContain("AWS");
  });
});

describe("cover letter Portuguese (CVM-031)", () => {
  const { cv, requirements, results } = run();
  const letter = (title: string, company: string) => heuristicCoverLetter({ cv, requirements, results, language: "pt", job: { title, company } });

  it("does not assume the gender of a company's name", () => {
    const text = letter("Dev", "Banco Exemplo S.A.");
    expect(text).not.toMatch(/\b(na|da) Banco/);
    expect(text).toContain("empresa Banco Exemplo S.A.");
  });

  it("reads correctly without a job title", () => {
    const text = letter("", "");
    expect(text).toContain("à vaga anunciada");
    expect(text).not.toContain("vaga de anunciada");
  });
});
