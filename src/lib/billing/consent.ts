/**
 * Purchase terms acceptance (Brazil). Under CDC art. 49 online buyers have a 7-day right of withdrawal
 * (direito de arrependimento) that cannot be waived, so the buyer does not give anything up here: they
 * confirm they read the Terms and the refund policy (full refund within 7 days if no paid analysis was
 * used, proportional otherwise). Decreto 7.962/2013 requires that information to be clear before paying.
 * The checkout route refuses to start without it and stores this record in the Stripe Checkout Session
 * (and its PaymentIntent / Subscription) metadata.
 *
 * Bump the version whenever the consent wording in the dictionaries or the refund policy changes.
 */
export const TERMS_VERSION = "2026-11-04-br";
export const REFUND_WINDOW_DAYS = 7;

/**
 * Stored by Supabase Auth with the new user, so the record the privacy policy mentions lives and dies with the
 * account. The time the account was really created is auth.users.created_at.
 */
export function signupMetadata(fullName: string, now: Date = new Date()) {
  return { full_name: fullName.trim(), terms_accepted_at: now.toISOString(), terms_version: TERMS_VERSION };
}

export function termsAcceptanceMetadata(now: Date = new Date()) {
  return {
    terms_accepted: "true",
    terms_accepted_at: now.toISOString(),
    terms_version: TERMS_VERSION,
  };
}
