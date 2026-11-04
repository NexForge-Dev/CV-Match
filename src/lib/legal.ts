import "server-only";
import { turnstileSiteKey } from "@/lib/captcha";
import { aiProvider, type ServerEnv } from "@/lib/env";
import type { LegalCondition, LegalSection } from "@/lib/i18n/marketing";

/**
 * Contact on the legal pages and in support links. Fixed in code on purpose: it is part of the published
 * policy, so a stale LEGAL_CONTACT_EMAIL in a deployment can no longer change it.
 */
export const LEGAL_CONTACT_EMAIL = "nexforge.d4v29@gmail.com";

/**
 * Identity of the service provider shown on the legal pages (LGPD art. 9; Decreto 7.962/2013 art. 2: name, CPF/CNPJ,
 * physical and e-mail address). Configured per deployment; a blank field is never filled with invented data: the
 * pages say the identification is pending, and setting LEGAL_OPERATOR_* is all it takes to publish it.
 * `npm run verify:keys` reports a production deployment while any is missing.
 */
export type LegalOperator = {
  operator: string | null;
  taxLabel: string;
  taxId: string | null;
  address: string | null;
  email: string;
  retentionDays: string;
};

/** CPF has 11 digits and CNPJ 14 characters (alphanumeric since 2026), punctuation aside. */
export function taxIdLabel(taxId: string | null): string {
  const compact = taxId?.replace(/[^0-9a-z]/gi, "") ?? "";
  if (compact.length === 14) return "CNPJ";
  if (/^\d{11}$/.test(compact)) return "CPF";
  return "CPF/CNPJ";
}

export function legalOperator(): LegalOperator {
  const v = (key: string) => process.env[key]?.trim() || null;
  const taxId = v("LEGAL_OPERATOR_TAX_ID");
  return {
    operator: v("LEGAL_OPERATOR_NAME"),
    taxLabel: taxIdLabel(taxId),
    taxId,
    address: v("LEGAL_OPERATOR_ADDRESS"),
    email: LEGAL_CONTACT_EMAIL,
    retentionDays: v("DOCUMENT_RETENTION_DAYS") ?? "30",
  };
}

/** Which conditional disclosures apply to this deployment. Mirrors how each feature is switched on. */
export function legalFeatures(): Record<LegalCondition, boolean> {
  const e = process.env;
  const ai = aiProvider({ AI_PROVIDER: e.AI_PROVIDER as ServerEnv["AI_PROVIDER"], ANTHROPIC_API_KEY: e.ANTHROPIC_API_KEY }) === "anthropic";
  const storedFiles = e.STORE_ORIGINAL_FILES === "true";
  return {
    ai,
    noAi: !ai,
    storedFiles,
    noStoredFiles: !storedFiles,
    turnstile: turnstileSiteKey(e.NEXT_PUBLIC_TURNSTILE_SITE_KEY) !== null,
    ocr: e.OCR_PROVIDER === "http" && Boolean(e.OCR_HTTP_URL),
    metrics: Boolean(e.NEXFORGE_ENDPOINT && e.NEXFORGE_INGEST_KEY && e.NEXFORGE_PSEUDONYM_SECRET),
  };
}

/** Replaces {operator}, {taxLabel}, {taxId}, {address}, {email} and {retentionDays} in a legal text. */
export function fillLegal(text: string, op: LegalOperator): string {
  return text.replace(/\{(operator|taxLabel|taxId|address|email|retentionDays)\}/g, (_, key: keyof LegalOperator) => op[key] ?? "");
}

const usesBlankField = (text: string, op: LegalOperator) =>
  [...text.matchAll(/\{(operator|taxId|address)\}/g)].some((m) => !op[m[1] as "operator" | "taxId" | "address"]);

/**
 * The paragraphs of a section for this deployment: conditional ones only when they apply, and a line that
 * depends on a blank operator field replaced by the section's `pending` notice (once).
 */
export function legalParagraphs(section: LegalSection, op: LegalOperator, features: Record<LegalCondition, boolean>): string[] {
  const out: string[] = [];
  let pendingShown = false;
  for (const p of section.paragraphs) {
    if (typeof p !== "string" && !features[p.when]) continue;
    const text = typeof p === "string" ? p : p.text;
    if (usesBlankField(text, op)) {
      if (section.pending && !pendingShown) out.push(fillLegal(section.pending, op));
      pendingShown = true;
      continue;
    }
    out.push(fillLegal(text, op));
  }
  return out;
}
