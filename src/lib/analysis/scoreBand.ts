/** Reading of the compatibility index shown to the user. Display only: it never changes the score. */
export type ScoreBand = "high" | "mid" | "low" | "none";

export const BAND_LIMITS = { mid: 45, high: 70 } as const;

export function scoreBand(score: number | null): ScoreBand {
  if (score === null) return "none";
  if (score >= BAND_LIMITS.high) return "high";
  return score >= BAND_LIMITS.mid ? "mid" : "low";
}

export const BAND_COLORS: Record<ScoreBand, string> = { high: "#059669", mid: "#d97706", low: "#dc2626", none: "#94a3b8" };
