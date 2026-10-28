import { afterEach, describe, expect, it } from "vitest";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { extractText } from "@/lib/documents/extract";
import { noOcr } from "@/lib/documents/ocr";
import { analyze, coverLetter, parseCv, extractJobRequirements, setProviderForTests } from "@/lib/ai/pipeline";
import { heuristicProvider } from "@/lib/ai/heuristic";
import type { AiProvider } from "@/lib/ai/provider";
import { applySuggestions } from "@/lib/analysis/suggestions";
import { cvToPlainText } from "@/lib/cv/schema";
import { renderCvDocx } from "@/lib/export/docx";
import { renderCvPdf } from "@/lib/export/pdf";
import { findSkills } from "@/lib/analysis/taxonomy";
import { CV_EN, JOB_ES } from "./fixtures";

afterEach(() => setProviderForTests(null));

async function pdfOf(text: string) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([595, 842]);
  text.split("\n").forEach((line, i) => page.drawText(line.replace(/•/g, "-"), { x: 40, y: 800 - i * 13, size: 9, font }));
  return doc.save();
}

describe("full flow: CV → job → analysis → edit → export", () => {
  it("runs end to end with the deterministic provider", async () => {
    // 1. Import
    const extraction = await extractText(await pdfOf(CV_EN), "pdf", noOcr);
    expect(extraction.status).toBe("ok");
    const { value: cv } = await parseCv(extraction.text);
    expect(cv.experiences.length).toBe(2);

    // 2. Job
    const { value: requirements } = await extractJobRequirements(JOB_ES);
    expect(requirements.length).toBeGreaterThan(5);

    // 3. Analysis
    const out = await analyze({ cv, requirements, jobText: JOB_ES, language: "es", maxSuggestions: null });
    expect(out.score.score).not.toBeNull();
    expect(out.droppedSuggestions).toBe(0);

    // 4. Accept every non-advisory, non-confirm suggestion and build a new version
    const accepted = out.suggestions
      .filter((s) => s.kind !== "gap_answer" && s.kind !== "confirm")
      .map((s) => ({ kind: s.kind, targetRef: s.targetRef, text: s.suggested, flags: s.flags, confirmedByUser: false }));
    const improved = applySuggestions(cv, accepted);
    expect(improved).not.toEqual(cv);
    // No technology appears in the improved CV that was not in the original.
    const before = new Set(findSkills(cvToPlainText(cv)).map((s) => s.id));
    expect(findSkills(cvToPlainText(improved)).filter((s) => !before.has(s.id))).toEqual([]);

    // 5. Export
    const pdf = await renderCvPdf(improved, "es", "modern");
    const docx = await renderCvDocx(improved, "es", "classic");
    expect((await extractText(pdf, "pdf", noOcr)).text).toContain("Ana Souza");
    expect((await extractText(docx, "docx", noOcr)).text).toContain("Ana Souza");
  });

  it("limits suggestions for the free tier", async () => {
    const { value: cv } = await parseCv(CV_EN);
    const { value: requirements } = await extractJobRequirements(JOB_ES);
    const out = await analyze({ cv, requirements, jobText: JOB_ES, language: "en", maxSuggestions: 3 });
    expect(out.suggestions).toHaveLength(3);
  });
});

describe("LLM provider guardrails (simulated model)", () => {
  const lyingProvider: AiProvider = {
    ...heuristicProvider,
    name: "fake-llm",
    async writeSuggestions(input) {
      const usage = { provider: "fake-llm", model: "fake", inputTokens: 10, outputTokens: 10 };
      return {
        value: [
          { kind: "summary", section: "summary", targetRef: null, original: input.cv.summary, suggested: "Senior engineer who increased revenue by 40% with Kubernetes and Docker", rationale: "", requiresConfirmation: false, flags: [] },
          { kind: "summary", section: "summary", targetRef: null, original: input.cv.summary, suggested: "Full Stack Developer building REST APIs with Node.js and PostgreSQL", rationale: "", requiresConfirmation: false, flags: [] },
        ],
        usage,
      };
    },
    async coverLetter() {
      return { value: "I led 12 Kubernetes migrations at Google.", usage: { provider: "fake-llm", model: "fake", inputTokens: 1, outputTokens: 1 } };
    },
  };

  it("drops invented facts from model suggestions", async () => {
    setProviderForTests(lyingProvider);
    const { value: cv } = await parseCv(CV_EN);
    const { value: requirements } = await extractJobRequirements(JOB_ES);
    const out = await analyze({ cv, requirements, jobText: JOB_ES, language: "en" });
    expect(out.droppedSuggestions).toBe(1);
    expect(out.suggestions.map((s) => s.suggested)).toEqual(["Full Stack Developer building REST APIs with Node.js and PostgreSQL"]);
  });

  it("replaces a cover letter with invented facts by a fact-based one", async () => {
    setProviderForTests(lyingProvider);
    const { value: cv } = await parseCv(CV_EN);
    const { value: requirements } = await extractJobRequirements(JOB_ES);
    const results = (await analyze({ cv, requirements, jobText: JOB_ES, language: "en" })).results;
    const letter = await coverLetter({ cv, requirements, results, language: "en", job: { title: "Full Stack", company: "LogiCo" } });
    expect(letter.value).not.toMatch(/Kubernetes|Google|12/);
    expect(letter.value).toContain("Ana Souza");
  });

  it("falls back to the deterministic engine when the model fails", async () => {
    setProviderForTests({
      ...heuristicProvider,
      name: "broken",
      async writeSuggestions() {
        throw new Error("model_unavailable");
      },
    });
    const { value: cv } = await parseCv(CV_EN);
    const { value: requirements } = await extractJobRequirements(JOB_ES);
    const out = await analyze({ cv, requirements, jobText: JOB_ES, language: "en" });
    expect(out.suggestions.length).toBeGreaterThan(0);
    expect(out.usage[0].provider).toBe("heuristic");
  });
});
