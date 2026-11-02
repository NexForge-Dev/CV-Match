import type { Locale } from "@/lib/i18n/config";

/**
 * Optional Cloudflare Turnstile captcha for the auth forms. Enabled only when
 * NEXT_PUBLIC_TURNSTILE_SITE_KEY is set; Supabase verifies the token when
 * Authentication → Attack Protection → CAPTCHA is on (deploy this code first,
 * then enable it there, or every login/signup is rejected).
 */
export const TURNSTILE_SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export function turnstileSiteKey(raw: string | undefined): string | null {
  const key = raw?.trim();
  return key ? key : null;
}

/** Extra Supabase auth options: `captchaToken` only when the widget produced one. */
export function captchaOptions(token: string | null): { captchaToken?: string } {
  return token ? { captchaToken: token } : {};
}

export function canSubmitWithCaptcha(siteKey: string | null, token: string | null): boolean {
  return !siteKey || Boolean(token);
}

/** Supabase answers "captcha protection: request disallowed (...)" when the token is missing, expired or reused. */
export function isCaptchaError(error: { message?: string } | null | undefined): boolean {
  return /captcha/i.test(error?.message ?? "");
}

export function turnstileLanguage(locale: Locale): string {
  return locale === "pt" ? "pt-br" : locale;
}
