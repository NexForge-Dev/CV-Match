import { cvDataSchema, type CvData, type CvLanguage } from "@/lib/cv/schema";

const LEGACY_KEY = "cvm_wizard_draft_v1";
const PREFIX = `${LEGACY_KEY}:`;

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
type Store = Pick<Storage, "getItem" | "setItem" | "removeItem" | "key" | "length">;

/** Everything saved in this tab that does not belong to `keepFor`, the unscoped key of older versions included. */
function otherDrafts(store: Store, keepFor?: string) {
  const keep = keepFor ? PREFIX + keepFor : null;
  const keys: string[] = [];
  for (let i = 0; i < store.length; i++) {
    const key = store.key(i);
    if (key && key !== keep && (key === LEGACY_KEY || key.startsWith(PREFIX))) keys.push(key);
  }
  return keys;
}

export function saveDraft(userId: string, draft: WizardDraft, store: Store = sessionStorage) {
  try {
    store.setItem(PREFIX + userId, JSON.stringify(draft));
  } catch {
    // Private mode or full storage: the wizard still works, it just cannot survive a reload.
  }
}

export function loadDraft(userId: string, store: Store = sessionStorage): WizardDraft | null {
  try {
    // A CV is personal data: whatever another account left in this tab goes, even if it never signed out.
    otherDrafts(store, userId).forEach((key) => store.removeItem(key));
    const raw = store.getItem(PREFIX + userId);
    if (!raw) return null;
    const draft = JSON.parse(raw) as WizardDraft;
    if (!Number.isInteger(draft.step) || !cvDataSchema.safeParse(draft.cv).success) return null;
    return draft;
  } catch {
    return null;
  }
}

/** Removes every draft in this tab: after the analysis is done, and on sign out. */
export function clearDrafts(store: Store = sessionStorage) {
  try {
    otherDrafts(store).forEach((key) => store.removeItem(key));
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
