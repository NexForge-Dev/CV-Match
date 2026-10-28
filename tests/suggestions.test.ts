import { describe, expect, it } from "vitest";
import { parseCvText } from "@/lib/cv/parse";
import { cvToPlainText } from "@/lib/cv/schema";
import { extractRequirements } from "@/lib/analysis/requirements";
import { matchRequirements } from "@/lib/analysis/match";
import {
  ApplyError,
  applySuggestions,
  derivedNumbers,
  generateHeuristicSuggestions,
  guardSuggestions,
  improveBullet,
  type SuggestionDraft,
} from "@/lib/analysis/suggestions";
import { checkFacts } from "@/lib/ai/factGuard";
import { heuristicCoverLetter, heuristicInterviewPrep } from "@/lib/analysis/extras";
import { findSkills } from "@/lib/analysis/taxonomy";
import { CV_EN, JOB_ES } from "./fixtures";

const cv = parseCvText(CV_EN);
const reqs = extractRequirements(JOB_ES);
const results = matchRequirements(cv, reqs);
const source = cvToPlainText(cv);

describe("heuristic suggestions never invent facts", () => {
  for (const language of ["en", "pt", "es"] as const) {
    it(`all ${language} suggestions pass the fact guard`, () => {
      const drafts = generateHeuristicSuggestions({ cv, requirements: reqs, results, language, jobText: JOB_ES });
      expect(drafts.length).toBeGreaterThan(3);
      const { kept, dropped } = guardSuggestions(drafts, cv, { allowedNumbers: derivedNumbers(cv), jobText: JOB_ES });
      expect(dropped).toBe(0);
      for (const d of kept.filter((k) => k.kind !== "confirm" && k.kind !== "gap_answer")) {
        const check = checkFacts(d.suggested, source, { allowedNumbers: derivedNumbers(cv) });
        expect(check.newSkills, d.suggested).toEqual([]);
        expect(check.newNumbers, d.suggested).toEqual([]);
      }
    });
  }

  it("does not put missing requirements (Docker/Kubernetes) into the CV text", () => {
    const drafts = generateHeuristicSuggestions({ cv, requirements: reqs, results, language: "en", jobText: JOB_ES });
    const editable = drafts.filter((d) => d.kind !== "confirm" && d.kind !== "gap_answer");
    expect(editable.some((d) => /docker|kubernetes/i.test(d.suggested))).toBe(false);
    const confirms = drafts.filter((d) => d.kind === "confirm");
    expect(confirms.map((c) => c.targetRef?.skill)).toEqual(expect.arrayContaining(["Docker", "Kubernetes"]));
    expect(confirms.every((c) => c.requiresConfirmation)).toBe(true);
  });

  it("suggests adding skills evidenced in experience but missing from the skills list", () => {
    const drafts = generateHeuristicSuggestions({ cv, requirements: reqs, results, language: "en", jobText: JOB_ES });
    expect(drafts.some((d) => d.kind === "skills_add" && d.suggested === "React")).toBe(true);
  });

  it("improves bullets without changing facts", () => {
    expect(improveBullet("Responsible for the development of a reactjs dashboard used by internal teams.", ["react"])).toBe(
      "Development of a React dashboard used by internal teams",
    );
    expect(improveBullet("Wrote unit tests with Jest, etc.", [])).toBe("Wrote unit tests with Jest");
  });
});

describe("fact guard", () => {
  it("rejects invented metrics and technologies", () => {
    const invented = checkFacts("Increased revenue by 45% using Kubernetes", source);
    expect(invented.ok).toBe(false);
    expect(invented.newNumbers).toContain("45%");
    expect(invented.newSkills).toContain("Kubernetes");
    expect(checkFacts("Reduced page load time by 30%", source).ok).toBe(true);
  });

  it("drops LLM-style drafts with invented facts", () => {
    const fake: SuggestionDraft[] = [
      { kind: "summary", section: "summary", targetRef: null, original: "", suggested: "Senior engineer with 12 years of Docker experience", rationale: "", requiresConfirmation: false, flags: [] },
      { kind: "summary", section: "summary", targetRef: null, original: "", suggested: "Full Stack Developer working with Node.js and PostgreSQL", rationale: "", requiresConfirmation: false, flags: [] },
    ];
    const { kept, dropped } = guardSuggestions(fake, cv);
    expect(dropped).toBe(1);
    expect(kept).toHaveLength(1);
  });
});

describe("applying suggestions", () => {
  it("creates a new CV and leaves the original untouched", () => {
    const before = JSON.stringify(cv);
    const exp = cv.experiences[0];
    const next = applySuggestions(cv, [
      { kind: "bullet_rewrite", targetRef: { experienceId: exp.id, bulletIndex: 0 }, text: "Development of a React dashboard", flags: [], confirmedByUser: false },
      { kind: "skills_add", targetRef: { skill: "React" }, text: "React", flags: [], confirmedByUser: false },
      { kind: "summary", targetRef: null, text: "New summary", flags: [], confirmedByUser: false },
    ]);
    expect(JSON.stringify(cv)).toBe(before);
    expect(next.experiences[0].bullets[0]).toBe("Development of a React dashboard");
    expect(next.skills).toContain("React");
    expect(next.summary).toBe("New summary");
  });

  it("requires explicit confirmation for unproven requirements", () => {
    expect(() => applySuggestions(cv, [{ kind: "confirm", targetRef: { skill: "Docker" }, text: "", flags: [], confirmedByUser: false }])).toThrow(ApplyError);
    const next = applySuggestions(cv, [{ kind: "confirm", targetRef: { skill: "Docker" }, text: "", flags: [], confirmedByUser: true }]);
    expect(next.skills).toContain("Docker");
  });

  it("blocks text with unfilled placeholders", () => {
    expect(() => applySuggestions(cv, [{ kind: "summary", targetRef: null, text: "Improved X by [number]%", flags: [], confirmedByUser: false }])).toThrow("placeholder_left");
  });

  it("only accepts pure reorderings of bullets", () => {
    const exp = cv.experiences[0];
    const reversed = [...exp.bullets].reverse().join("\n");
    const next = applySuggestions(cv, [{ kind: "bullets_order", targetRef: { experienceId: exp.id }, text: reversed, flags: [], confirmedByUser: false }]);
    expect(next.experiences[0].bullets).toEqual([...exp.bullets].reverse());
    const tampered = applySuggestions(cv, [{ kind: "bullets_order", targetRef: { experienceId: exp.id }, text: "Invented bullet\nAnother", flags: [], confirmedByUser: false }]);
    expect(tampered.experiences[0].bullets).toEqual(exp.bullets);
  });
});

describe("cover letter and interview prep", () => {
  const input = { cv, requirements: reqs, results, language: "es" as const, job: { title: "Desarrollador Full Stack", company: "LogiCo" } };

  it("cover letter uses only CV facts", () => {
    const letter = heuristicCoverLetter(input);
    expect(letter).toContain("LogiCo");
    expect(letter).toContain("Ana Souza");
    const cvSkills = new Set(findSkills(source).map((s) => s.id));
    expect(findSkills(letter).every((s) => cvSkills.has(s.id))).toBe(true);
  });

  it("interview prep covers found and missing requirements", () => {
    const items = heuristicInterviewPrep(input);
    expect(items.length).toBeGreaterThan(3);
    expect(items.some((i) => i.requirement === "Docker")).toBe(true);
  });
});
