import "server-only";

/**
 * Identity of the service provider shown on the legal pages (LGPD art. 9; Decreto 7.962/2013 art. 2: name, CPF/CNPJ, physical and e-mail address).
 * Configured per deployment; `npm run verify:keys` blocks a launch while any is missing.
 */
export const LEGAL_ENV = ["LEGAL_OPERATOR_NAME", "LEGAL_OPERATOR_TAX_ID", "LEGAL_OPERATOR_ADDRESS", "LEGAL_CONTACT_EMAIL"] as const;

export type LegalOperator = { operator: string; taxId: string; address: string; email: string; backupDays: string };

export function legalOperator(): LegalOperator {
  const v = (key: string) => process.env[key]?.trim() || "—";
  return {
    operator: v("LEGAL_OPERATOR_NAME"),
    taxId: v("LEGAL_OPERATOR_TAX_ID"),
    address: v("LEGAL_OPERATOR_ADDRESS"),
    email: v("LEGAL_CONTACT_EMAIL"),
    // Supabase keeps daily backups for 7 days on the Pro plan (longer with PITR add-ons).
    backupDays: process.env.LEGAL_BACKUP_RETENTION_DAYS?.trim() || "7",
  };
}

/** Replaces {operator}, {taxId}, {address}, {email} and {backupDays} in a legal text. */
export function fillLegal(text: string, op: LegalOperator): string {
  return text.replace(/\{(operator|taxId|address|email|backupDays)\}/g, (_, key: keyof LegalOperator) => op[key]);
}
