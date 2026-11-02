import type { Dictionary } from "@/lib/i18n/dictionaries";
import { isCaptchaError } from "@/lib/captcha";

/**
 * Translated message for a Supabase Auth error. Supabase answers in English, so its message is never
 * shown as is; unknown errors get the generic text.
 */
export function authErrorMessage(t: Dictionary, error: { message?: string; code?: string; status?: number } | null | undefined): string {
  if (!error) return t.errors.generic;
  if (isCaptchaError(error)) return t.auth.captchaFailed;
  const code = error.code ?? "";
  const message = error.message ?? "";
  if (code === "user_already_exists" || code === "email_exists" || /already registered/i.test(message)) return t.auth.alreadyRegistered;
  if (code === "weak_password" || /password should/i.test(message)) return t.auth.weakPassword;
  if (code === "same_password") return t.auth.samePassword;
  if (code === "email_address_invalid" || code === "validation_failed" || /invalid.*email|email.*invalid/i.test(message)) return t.auth.invalidEmail;
  if (code.startsWith("over_") || error.status === 429) return t.auth.tooManyAttempts;
  if (code === "session_not_found" || code === "otp_expired" || /auth session missing/i.test(message)) return t.auth.linkExpired;
  if (code === "email_not_confirmed" || /confirm/i.test(message)) return t.auth.emailNotConfirmed;
  return t.errors.generic;
}
