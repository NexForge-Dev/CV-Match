/**
 * EU right of withdrawal (Directive 2011/83/EU art. 16(m); Spain: TRLGDCU art. 103(m)).
 * Packs and subscriptions are digital content/services supplied right after payment, so the buyer
 * must expressly request immediate performance and acknowledge losing the 14-day withdrawal right
 * before paying. The checkout route refuses to start without it and stores this record in the
 * Stripe Checkout Session (and its PaymentIntent / Subscription) metadata.
 *
 * Bump the version whenever the consent wording in the dictionaries changes.
 */
export const WITHDRAWAL_WAIVER_VERSION = "2026-11-02";

export function withdrawalWaiverMetadata(now: Date = new Date()) {
  return {
    withdrawal_waiver: "accepted",
    withdrawal_waiver_at: now.toISOString(),
    withdrawal_waiver_version: WITHDRAWAL_WAIVER_VERSION,
  };
}
