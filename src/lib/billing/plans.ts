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
  billing_interval: z.enum(["month", "year"]).nullable(),
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
  { id: "free", name: "Free", kind: "free", price_cents: 0, currency: "eur", billing_interval: null, analyses_included: 1, features: { max_suggestions: 5, cover_letter: false, interview_prep: false, export_docx: true, export_pdf: true }, sort: 0 },
  { id: "pack_5", name: "Analysis pack", kind: "pack", price_cents: 700, currency: "eur", billing_interval: null, analyses_included: 5, features: { max_suggestions: null, cover_letter: true, interview_prep: true, export_docx: true, export_pdf: true }, sort: 1 },
  { id: "pro_monthly", name: "Pro", kind: "subscription", price_cents: 1200, currency: "eur", billing_interval: "month", analyses_included: 40, features: { max_suggestions: null, cover_letter: true, interview_prep: true, export_docx: true, export_pdf: true }, sort: 2 },
];

export function parsePlans(rows: unknown[]): Plan[] {
  return rows
    .map((r) => planSchema.safeParse(r))
    .filter((r) => r.success)
    .map((r) => r.data!)
    .sort((a, b) => a.sort - b.sort);
}
