import { describe, expect, it } from "vitest";
import { matchRequirements } from "@/lib/analysis/match";
import type { Requirement } from "@/lib/analysis/requirements";
import { generateHeuristicSuggestions, improveBullet } from "@/lib/analysis/suggestions";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { marketing } from "@/lib/i18n/marketing";
import { cvDataSchema } from "@/lib/cv/schema";

/**
 * Public copy for the current production state: only the rule-based engine runs, so nothing here may promise a
 * rewrite or a translation. This file goes away with the copy commit if AI is enabled.
 */
const LOCALES = ["pt", "en", "es"] as const;

const requirement = (id: string, label: string, skillId: string): Requirement => ({
  id, label, sourceText: label, category: "skill", importance: "must", skillIds: [skillId], anyOf: false, minYears: null, minLevel: null,
});

describe("landing copy matches the rule-based engine", () => {
  it.each(LOCALES)("promises neither a rewrite nor a translation (%s)", (l) => {
    const t = marketing[l];
    const text = JSON.stringify([t.how, t.pricing.coverLetter, t.faq, t.hero, t.finalCta]);
    expect(text).not.toMatch(/reescrita de experi|reescritura de experi|bullet rewrites|personaliz/i);
    expect(text).not.toMatch(/(gerar e exportar|generar y exportar|generate and export)/i);
  });

  it.each(LOCALES)("the before/after example is real engine output (%s)", (l) => {
    const example = marketing[l].beforeAfter.examples[0];
    expect(improveBullet(example.before, ["react"])).toBe(example.after);
  });

  it.each(LOCALES)("the result preview shows a real engine summary (%s)", (l) => {
    const p = marketing[l].preview.suggestion;
    const [headline, language] = l === "en" ? ["Full Stack Developer", "English"] : l === "pt" ? ["Desenvolvedora Full Stack", "Inglês"] : ["Desarrolladora Full Stack", "Inglés"];
    const cv = cvDataSchema.parse({
      contact: { headline },
      summary: p.current,
      skills: ["React", "Node.js", "PostgreSQL"],
      languages: [{ name: language, level: "C1" }],
    });
    const requirements = [requirement("r1", "React", "react"), requirement("r2", "Node.js", "nodejs"), requirement("r3", "PostgreSQL", "postgresql")];
    const results = matchRequirements(cv, requirements);
    const summary = generateHeuristicSuggestions({ cv, requirements, results, language: l, jobText: "" }).find((s) => s.kind === "summary");
    expect(summary?.suggested).toBe(p.suggested);
    expect(summary?.rationale).toBe(p.rationale);
  });

  it.each(LOCALES)("in-app messages do not imply AI is running (%s)", (l) => {
    const t = dictionaries[l];
    expect(t.errors.usage_limit).not.toMatch(/\b(AI|IA)\b/);
    expect(t.analysis.droppedNotice(2)).not.toMatch(/\b(AI|IA)\b/);
  });
});
