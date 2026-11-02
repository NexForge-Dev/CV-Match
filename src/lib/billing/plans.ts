import { z } from "zod";

export const planFeaturesSchema = z.object({
  max_suggestions: z.number().int().positive().nullable().default(null),
  cover_letter: z.boolean().default(false),
  interview_prep: z.boolean().default(false),
  export_docx: z.boolean().default(true),
  export_pdf: z.boolean().default(true),
});
export type PlanFeatures = z.infer<typeof planFeaturesSchema>;

export const planSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum(["free", "pack", "subscription"]),
  price_cents: z.number().int(),
  currency: z.string(),
  billing_interval: z.enum(["month", "quarter", "year"]).nullable(),
  analyses_included: z.number().int(),
  features: planFeaturesSchema,
  stripe_price_id: z.string().nullable().optional(),
  sort: z.number().int(),
});
export type Plan = z.infer<typeof planSchema>;

/**
 * Display-only fallback used when the database is not reachable (e.g. during
 * a static build). The `plans` table is the source of truth for prices,
 * limits and features — edit it, not this file.
 */
export const FALLBACK_PLANS: Plan[] = [
  { id: "free", name: "Grátis", kind: "free", price_cents: 0, currency: "brl", billing_interval: null, analyses_included: 1, features: { max_suggestions: 5, cover_letter: false, interview_prep: false, export_docx: true, export_pdf: true }, sort: 0 },
  { id: "pack_10", name: "Pacote 10 análises", kind: "pack", price_cents: 1990, currency: "brl", billing_interval: null, analyses_included: 10, features: { max_suggestions: null, cover_letter: true, interview_prep: true, export_docx: true, export_pdf: true }, sort: 1 },
  { id: "pro_monthly", name: "Pro mensal", kind: "subscription", price_cents: 2990, currency: "brl", billing_interval: "month", analyses_included: 50, features: { max_suggestions: null, cover_letter: true, interview_prep: true, export_docx: true, export_pdf: true }, sort: 2 },
  { id: "pro_quarterly", name: "Pro trimestral", kind: "subscription", price_cents: 6990, currency: "brl", billing_interval: "quarter", analyses_included: 150, features: { max_suggestions: null, cover_letter: true, interview_prep: true, export_docx: true, export_pdf: true }, sort: 3 },
];

/** Stripe has no "quarter" interval: it is billed as every 3 months. */
export function stripeRecurring(interval: Plan["billing_interval"]): { interval: "month" | "year"; interval_count: number } {
  if (interval === "quarter") return { interval: "month", interval_count: 3 };
  return { interval: interval ?? "month", interval_count: 1 };
}

export function parsePlans(rows: unknown[]): Plan[] {
  return rows
    .map((r) => planSchema.safeParse(r))
    .filter((r) => r.success)
    .map((r) => r.data!)
    .sort((a, b) => a.sort - b.sort);
}
