export const LOCALES = ["pt", "es", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "cvm_locale";

export const LOCALE_NAMES: Record<Locale, string> = { pt: "Português", es: "Español", en: "English" };

export function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && (LOCALES as readonly string[]).includes(v);
}

/** Picks the best supported locale from an Accept-Language header. */
export function fromAcceptLanguage(header: string | null): Locale {
  if (!header) return DEFAULT_LOCALE;
  for (const part of header.split(",")) {
    const code = part.split(";")[0].trim().slice(0, 2).toLowerCase();
    if (isLocale(code)) return code;
  }
  return DEFAULT_LOCALE;
}

export function formatDate(iso: string, locale: Locale) {
  const tag = locale === "pt" ? "pt-BR" : locale === "es" ? "es-ES" : "en-GB";
  return new Date(iso).toLocaleDateString(tag, { day: "2-digit", month: "short", year: "numeric" });
}

export function formatPrice(cents: number, currency: string, locale: Locale) {
  const tag = locale === "pt" ? "pt-PT" : locale === "es" ? "es-ES" : "en-IE";
  return new Intl.NumberFormat(tag, { style: "currency", currency: currency.toUpperCase(), minimumFractionDigits: cents % 100 === 0 ? 0 : 2 }).format(cents / 100);
}
