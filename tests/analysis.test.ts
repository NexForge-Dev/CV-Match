import { describe, expect, it } from "vitest";
import { parseCvText, detectHeading } from "@/lib/cv/parse";
import { extractRequirements } from "@/lib/analysis/requirements";
import { computeScore, matchRequirements, yearsOfExperience } from "@/lib/analysis/match";
import { cvDataSchema } from "@/lib/cv/schema";
import { CV_EN, JOB_ES } from "./fixtures";

const NOW = new Date(Date.UTC(2026, 9, 1));

describe("CV parsing", () => {
  const cv = parseCvText(CV_EN);

  it("detects headings in three languages", () => {
    expect(detectHeading("Experiência Profissional")).toBe("experience");
    expect(detectHeading("EXPERIENCIA LABORAL:")).toBe("experience");
    expect(detectHeading("Skills")).toBe("skills");
    expect(detectHeading("Formación académica")).toBe("education");
    expect(detectHeading("I worked on many skills")).toBeNull();
  });

  it("extracts contact, experiences, education, skills, projects and languages", () => {
    expect(cv.contact.fullName).toBe("Ana Souza");
    expect(cv.contact.headline).toBe("Full Stack Developer");
    expect(cv.contact.email).toBe("ana.souza@example.com");
    expect(cv.experiences).toHaveLength(2);
    expect(cv.experiences[0].title).toBe("Full Stack Developer");
    expect(cv.experiences[0].company).toBe("Acme Tech");
    expect(cv.experiences[0].start).toMatch(/2021/);
    expect(cv.experiences[0].end).toMatch(/Present/);
    expect(cv.experiences[0].bullets).toHaveLength(3);
    expect(cv.experiences[1].company).toBe("Beta Labs");
    expect(cv.education[0].institution).toMatch(/São Paulo/);
    expect(cv.skills).toContain("TypeScript");
    expect(cv.projects[0].technologies).toEqual(["Next.js", "Tailwind CSS"]);
    expect(cv.languages.find((l) => l.name === "English")?.level).toBe("C1");
    expect(cv.certifications).toEqual(["AWS Certified Cloud Practitioner"]);
  });

  it("never produces content that is not in the source", () => {
    const all = JSON.stringify(cv);
    expect(all).not.toMatch(/Docker|Kubernetes/);
  });

  it("computes years of experience merging periods", () => {
    const years = yearsOfExperience(cv.experiences, NOW)!;
    expect(years).toBeGreaterThan(7);
    expect(years).toBeLessThan(8);
  });
});

describe("requirements and matching", () => {
  const cv = parseCvText(CV_EN);
  const reqs = extractRequirements(JOB_ES);
  const results = matchRequirements(cv, reqs, NOW);
  const byLabel = (label: string) => {
    const req = reqs.find((r) => r.label === label);
    expect(req, `requirement ${label}`).toBeDefined();
    return { req: req!, res: results.find((r) => r.requirementId === req!.id)! };
  };

  it("extracts must and nice-to-have requirements, ignoring benefits", () => {
    expect(byLabel("React").req.importance).toBe("must");
    expect(byLabel("React").req.minYears).toBe(3);
    expect(byLabel("Kubernetes").req.importance).toBe("nice");
    expect(byLabel("AWS").req.importance).toBe("nice");
    expect(reqs.some((r) => /vacaciones|salario/i.test(r.sourceText))).toBe(false);
    expect(reqs.some((r) => /startup/i.test(r.sourceText))).toBe(false);
  });

  it("classifies evidence: found, partial, not identified, ambiguous", () => {
    expect(byLabel("Node.js").res.status).toBe("found");
    expect(byLabel("PostgreSQL").res.status).toBe("found");
    expect(byLabel("Docker").res.status).toBe("not_found");
    expect(byLabel("Docker").res.notes).toContain("not_in_document");
    expect(byLabel("Kubernetes").res.status).toBe("not_found");
    expect(byLabel("AWS").res.status).toBe("found"); // certification
    expect(byLabel("English").res.status).toBe("found");
    const dynamic = reqs.find((r) => /entorno dinamico|entorno dinámico/i.test(r.sourceText))!;
    expect(results.find((r) => r.requirementId === dynamic.id)!.status).toBe("ambiguous");
  });

  it("uses related skills and years for partial evidence", () => {
    const react = byLabel("React").res;
    // "reactjs" is in the Acme role (2021–present, > 3 years)
    expect(react.status).toBe("found");
    expect(react.evidence[0].section).toBe("experience");
  });

  it("matches education by field", () => {
    const edu = reqs.find((r) => r.category === "education")!;
    expect(edu).toBeDefined();
    const res = results.find((r) => r.requirementId === edu.id)!;
    expect(["found", "partial"]).toContain(res.status);
  });

  it("computes an explainable weighted score", () => {
    const score = computeScore(reqs, results);
    expect(score.score).not.toBeNull();
    expect(score.score!).toBeGreaterThan(0);
    expect(score.score!).toBeLessThan(100);
    expect(score.counts.not_found).toBeGreaterThanOrEqual(2);
    expect(score.scoredRequirements).toBe(results.length - score.counts.ambiguous);
  });

  it("returns a null score when nothing is scorable", () => {
    const empty = cvDataSchema.parse({});
    expect(computeScore([], matchRequirements(empty, [])).score).toBeNull();
  });

  it("partial evidence when only a related skill exists", () => {
    const vueOnly = cvDataSchema.parse({ experiences: [{ id: "e1", title: "Dev", bullets: ["Built apps with Vue.js"] }] });
    const reqs2 = extractRequirements("Requirements\n- React");
    const [res] = matchRequirements(vueOnly, reqs2);
    expect(res.status).toBe("partial");
    expect(res.relatedSkills).toContain("Vue.js");
  });

  it("missing years makes evidence partial", () => {
    const cv2 = cvDataSchema.parse({ experiences: [{ id: "e1", title: "Dev", start: "2025", end: "2026", bullets: ["Python services"] }] });
    const [res] = matchRequirements(cv2, extractRequirements("Requirements\n- 5 years of Python"), NOW);
    expect(res.status).toBe("partial");
    expect(res.notes).toContain("years_below_required");
  });

  it("language level below required is partial", () => {
    const cv3 = cvDataSchema.parse({ languages: [{ name: "English", level: "B1" }] });
    const [res] = matchRequirements(cv3, extractRequirements("Requirements\n- English C1"));
    expect(res.status).toBe("partial");
    expect(res.notes).toContain("level_below_required");
  });
});
