import { cvDataSchema, type CvData, type CvLanguage } from "@/lib/cv/schema";

const KEY = "cvm_wizard_draft_v1";

export interface WizardDraft {
  step: number;
  pasted: string;
  // The server already created this document: keeping it avoids a second upload after a reload.
  extraction: { documentId: string; status: "ok" | "low_text" | "needs_ocr" | "failed"; warnings: string[]; text: string; injectionSuspected: boolean; cv: CvData } | null;
  cv: CvData;
  cvTitle: string;
  cvLanguage: CvLanguage;
  formKey: string;
  versionId: string | null;
  chosenTitle: string;
  jobMode: "new" | "saved";
  savedJobId: string;
  job: { title: string; company: string; location: string; language: CvLanguage; url: string; rawText: string };
  createdJob: { key: string; id: string } | null;
  outputLanguage: CvLanguage;
}

/** sessionStorage: it stays in this tab, and a phone browser that reloads the tab on return still has it. */
type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function saveDraft(draft: WizardDraft, store: Store = sessionStorage) {
  try {
    store.setItem(KEY, JSON.stringify(draft));
  } catch {
    // Private mode or full storage: the wizard still works, it just cannot survive a reload.
  }
}

export function loadDraft(store: Store = sessionStorage): WizardDraft | null {
  try {
    const raw = store.getItem(KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as WizardDraft;
    if (!Number.isInteger(draft.step) || !cvDataSchema.safeParse(draft.cv).success) return null;
    return draft;
  } catch {
    return null;
  }
}

export function clearDraft(store: Store = sessionStorage) {
  try {
    store.removeItem(KEY);
  } catch {
    // Same as saveDraft.
  }
}

/** The step in the URL, limited to the ones the data at hand allows: step 2 needs a chosen CV, step 1 an extraction. */
export function stepFromUrl(search: string, can: { review: boolean; job: boolean }): number {
  const step = Number(new URLSearchParams(search).get("step"));
  if (step === 2 && can.job) return 2;
  if (step === 1 && can.review) return 1;
  return 0;
}
