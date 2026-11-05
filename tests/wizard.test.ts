import { describe, expect, it } from "vitest";
import { clearDrafts, loadDraft, saveDraft, stepFromUrl, type WizardDraft } from "@/lib/client/wizardDraft";
import { signupMetadata, TERMS_VERSION } from "@/lib/billing/consent";
import { emptyCv } from "@/lib/cv/schema";

function memory() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    key: (i: number) => [...data.keys()][i] ?? null,
    get length() {
      return data.size;
    },
  };
}

const draft = (): WizardDraft => ({
  step: 2, pasted: "", extraction: null, cv: emptyCv(), cvTitle: "CV", cvLanguage: "pt", formKey: "doc-1", versionId: "v1", chosenTitle: "CV · v1",
  jobMode: "new", savedJobId: "", job: { title: "Dev", company: "", location: "", language: "pt", url: "", rawText: "texto da vaga" }, createdJob: null, outputLanguage: "pt",
});

describe("wizard draft (CVM-016)", () => {
  it("survives a reload and goes away when the analysis is done", () => {
    const store = memory();
    saveDraft("a", draft(), store);
    expect(loadDraft("a", store)).toEqual(draft());
    clearDrafts(store);
    expect(loadDraft("a", store)).toBeNull();
    expect(store.length).toBe(0);
  });

  it("ignores damaged or outdated drafts", () => {
    const store = memory();
    store.setItem("cvm_wizard_draft_v1:a", "{not json");
    expect(loadDraft("a", store)).toBeNull();
    store.setItem("cvm_wizard_draft_v1:a", JSON.stringify({ step: "x" }));
    expect(loadDraft("a", store)).toBeNull();
  });

  it("keeps working when storage is unavailable", () => {
    const denied = () => {
      throw new Error("denied");
    };
    const broken = { getItem: denied, setItem: denied, removeItem: denied, key: denied, get length(): number { return denied(); } };
    expect(() => saveDraft("a", draft(), broken)).not.toThrow();
    expect(loadDraft("a", broken)).toBeNull();
    expect(() => clearDrafts(broken)).not.toThrow();
  });

  it("never shows one account the draft of another (D3)", () => {
    const store = memory();
    saveDraft("a", draft(), store);
    expect(loadDraft("b", store)).toBeNull();
    expect(store.length).toBe(0); // and it is gone, not just hidden
    saveDraft("a", draft(), store);
    saveDraft("a", draft(), store);
    expect(loadDraft("a", store)).toEqual(draft());
  });

  it("purges the unscoped key of the previous version, and leaves the rest of the tab alone", () => {
    const store = memory();
    store.setItem("cvm_wizard_draft_v1", JSON.stringify(draft()));
    store.setItem("something_else", "x");
    expect(loadDraft("a", store)).toBeNull();
    expect(store.getItem("cvm_wizard_draft_v1")).toBeNull();
    expect(store.getItem("something_else")).toBe("x");
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
