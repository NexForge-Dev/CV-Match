import { describe, expect, it } from "vitest";
import { clearDraft, loadDraft, saveDraft, stepFromUrl, type WizardDraft } from "@/lib/client/wizardDraft";
import { signupMetadata, TERMS_VERSION } from "@/lib/billing/consent";
import { emptyCv } from "@/lib/cv/schema";

function memory() {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v), removeItem: (k: string) => void data.delete(k) };
}

const draft = (): WizardDraft => ({
  step: 2, pasted: "", extraction: null, cv: emptyCv(), cvTitle: "CV", cvLanguage: "pt", formKey: "doc-1", versionId: "v1", chosenTitle: "CV · v1",
  jobMode: "new", savedJobId: "", job: { title: "Dev", company: "", location: "", language: "pt", url: "", rawText: "texto da vaga" }, createdJob: null, outputLanguage: "pt",
});

describe("wizard draft (CVM-016)", () => {
  it("survives a reload and goes away when the analysis is done", () => {
    const store = memory();
    saveDraft(draft(), store);
    expect(loadDraft(store)).toEqual(draft());
    clearDraft(store);
    expect(loadDraft(store)).toBeNull();
  });

  it("ignores damaged or outdated drafts", () => {
    const store = memory();
    store.setItem("cvm_wizard_draft_v1", "{not json");
    expect(loadDraft(store)).toBeNull();
    store.setItem("cvm_wizard_draft_v1", JSON.stringify({ step: "x" }));
    expect(loadDraft(store)).toBeNull();
  });

  it("keeps working when storage is unavailable", () => {
    const broken = { getItem() { throw new Error("denied"); }, setItem() { throw new Error("denied"); }, removeItem() { throw new Error("denied"); } };
    expect(() => saveDraft(draft(), broken)).not.toThrow();
    expect(loadDraft(broken)).toBeNull();
    expect(() => clearDraft(broken)).not.toThrow();
  });

  it("only goes back to steps that have their data", () => {
    expect(stepFromUrl("?step=2", { review: true, job: true })).toBe(2);
    expect(stepFromUrl("?step=2", { review: true, job: false })).toBe(0);
    expect(stepFromUrl("?step=1", { review: false, job: true })).toBe(0);
    expect(stepFromUrl("?step=1", { review: true, job: false })).toBe(1);
    expect(stepFromUrl("", { review: true, job: true })).toBe(0);
    expect(stepFromUrl("?step=9", { review: true, job: true })).toBe(0);
  });
});

describe("signup consent (CVM-012)", () => {
  it("records which terms were accepted and when", () => {
    expect(signupMetadata("  Ana Souza ", new Date("2026-11-05T10:00:00Z"))).toEqual({ full_name: "Ana Souza", terms_accepted_at: "2026-11-05T10:00:00.000Z", terms_version: TERMS_VERSION });
  });
});
