-- CV Match is sold in Brazil: prices in BRL (final consumer prices) and plan names in pt-BR.
-- Stripe prices are per currency, so the old EUR price ids are cleared: run `npm run stripe:sync`
-- after this migration to create the BRL prices (checkout falls back to inline price_data meanwhile).

alter table public.plans alter column currency set default 'brl';

update public.plans set currency = 'brl', stripe_price_id = null where currency <> 'brl';

update public.plans set name = 'Grátis', price_cents = 0 where id = 'free';
update public.plans set name = 'Pacote 10 análises', price_cents = 1990 where id = 'pack_10';
update public.plans set name = 'Pro mensal', price_cents = 2990 where id = 'pro_monthly';
update public.plans set name = 'Pro trimestral', price_cents = 6990 where id = 'pro_quarterly';
