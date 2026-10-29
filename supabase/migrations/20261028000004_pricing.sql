-- ---------------------------------------------------------------------------
-- Launch pricing (benchmarked against Jobscan, Teal, Kickresume, Enhancv, Rezi):
--   free          €0      1 limited analysis
--   pack_10       €9.90   10 analyses, one-time (replaces pack_5)
--   pro_monthly   €14.90  per month, 50 analyses
--   pro_quarterly €34.90  every 3 months, 150 analyses
-- Prices are VAT-inclusive consumer prices. Caps keep every plan profitable at full use:
-- ~€0.10 of AI per analysis (Haiku extracts, Sonnet writes) vs ~€11.80 net per month.
-- ---------------------------------------------------------------------------
alter table public.plans drop constraint if exists plans_billing_interval_check;
alter table public.plans add constraint plans_billing_interval_check
  check (billing_interval in ('month', 'quarter', 'year'));

-- pack_5 is kept (inactive) so past purchases still resolve to a plan row.
update public.plans set active = false where id = 'pack_5';

update public.plans set price_cents = 1490, analyses_included = 50, sort = 2 where id = 'pro_monthly';

insert into public.plans (id, name, kind, price_cents, currency, billing_interval, analyses_included, features, sort) values
  ('pack_10', 'Analysis pack', 'pack', 990, 'eur', null, 10,
   '{"max_suggestions": null, "cover_letter": true, "interview_prep": true, "export_docx": true, "export_pdf": true}', 1),
  ('pro_quarterly', 'Pro (3 months)', 'subscription', 3490, 'eur', 'quarter', 150,
   '{"max_suggestions": null, "cover_letter": true, "interview_prep": true, "export_docx": true, "export_pdf": true}', 3)
on conflict (id) do update set
  price_cents = excluded.price_cents,
  billing_interval = excluded.billing_interval,
  analyses_included = excluded.analyses_included,
  features = excluded.features,
  sort = excluded.sort,
  active = true;
