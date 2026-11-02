# Payments (Stripe)

CV Match sells two kinds of products through **Stripe Checkout**:

| Plan id         | Kind           | Launch price      | What it grants                                        |
|-----------------|----------------|-------------------|-------------------------------------------------------|
| `free`          | free           | R$ 0              | 1 analysis on signup, max 5 suggestions, no extras     |
| `pack_10`       | one-time pack  | R$ 19,90          | 10 full analyses (paid credits, never expire)          |
| `pro_monthly`   | subscription   | R$ 29,90 / month  | 50 full analyses per billing period                    |
| `pro_quarterly` | subscription   | R$ 69,90 / 3 months | 150 full analyses per billing period                 |

CV Match is sold in **Brazil**: prices are final consumer prices in BRL (migration `20261102000007_brasil.sql`),
set below international competitors (Jobscan, Resume Worded, Teal+, Rezi, Kickresume, Enhancv) and adjusted to
Brazilian purchasing power. Payment methods are the ones enabled in the Stripe Dashboard (card, Pix, boleto — Pix
and boleto are one-time only, so subscriptions are card). `pack_5` is kept inactive for past purchases.

### Unit economics (estimate — verify with real `usage_events` token counts)

One full analysis (parse CV + extract job on Haiku 5.5, suggestions + cover letter + interview prep on
Sonnet 5.5) ≈ 16.5k input / 13.4k output tokens ≈ US$0.11 ≈ **R$ 0,60**. Net = price − Stripe card fee
(~3.99% + R$ 0,39; Pix is cheaper). No VAT is withheld per sale (individual seller — income tax via carnê-leão).

| Plan | Net revenue | AI cost at full use | Margin at full use |
|---|---|---|---|
| `pack_10` | R$ 18,72 | R$ 6,00 | R$ 12,72 (68%) |
| `pro_monthly` | R$ 28,32 | R$ 30,00 | **−R$ 1,68** |
| `pro_quarterly` | R$ 66,72 | R$ 90,00 | **−R$ 23,28** |
| `free` | R$ 0 | ~R$ 0,40 (no extras) | acquisition cost |

With the Anthropic engine on, the Pro plans lose money if a subscriber uses the whole quota (most will not).
Either lower `analyses_included` (e.g. 30 / 90) or keep `AI_DAILY_LIMIT` tight; with `AI_PROVIDER=heuristic`
the AI cost is zero. Check the real cost per analysis before deciding:
`select model, sum(input_tokens), sum(output_tokens) from usage_events where created_at > now() - interval '30 days' group by 1;`

They live in the `plans` table, not in code (migration `20261028000004_pricing.sql`).

## Syncing plans to Stripe

```bash
npm run stripe:sync                                   # test mode, local DB (.env.local)
ENV_FILE=.env.production.local npm run stripe:sync    # live mode, production DB
```

Creates/updates one Stripe Product per plan (`cvmatch_<plan id>`) with a tax-inclusive (final) Price (lookup key
`cvmatch_<plan id>`) and writes the price id to `plans.stripe_price_id`. Run it again after every price change:
Stripe prices are immutable, so a new Price replaces the old one (existing subscribers keep their price).
Price ids differ between test and live mode — run it once per environment.

## Changing prices, limits and benefits (no code change)

Edit the `plans` row in the Supabase dashboard (Table editor) or with SQL:

```sql
update public.plans set price_cents = 1290, analyses_included = 15 where id = 'pack_10';  -- then: npm run stripe:sync
update public.plans set features = features || '{"max_suggestions": 3}' where id = 'free';
update public.plans set active = false where id = 'pro_monthly';         -- hide a plan
insert into public.plans (id, name, kind, price_cents, currency, billing_interval, analyses_included, features, sort)
values ('pro_yearly', 'Pro (yearly)', 'subscription', 19900, 'brl', 'year', 500,
        '{"max_suggestions": null, "cover_letter": true, "interview_prep": true, "export_docx": true, "export_pdf": true}', 3);
```

- Without `stripe_price_id`, checkout builds the Stripe price **from the database row** (`price_data`). With it (set by `npm run stripe:sync`), the synced Stripe Price is used — re-sync after changing a price so both agree.
- `billing_interval`: `month`, `quarter` (billed every 3 months) or `year`.
- If you prefer Stripe-managed prices (e.g. for tax settings or coupons on specific prices), create the Price in Stripe and put its id in `plans.stripe_price_id`; that price is then used instead.
- `features` keys: `max_suggestions` (number or null = unlimited), `cover_letter`, `interview_prep`, `export_pdf`, `export_docx`.
- The free plan's `analyses_included` is the number of free credits granted on signup.

## Terms and refund policy (consent before checkout)

Brazilian consumers have a 7-day right of withdrawal on online purchases (CDC art. 49) that cannot be waived.
Policy: full refund within 7 days if no paid analysis was used, proportional to the unused analyses otherwise.
Decreto 7.962/2013 requires that information to be clear before paying, so:

- `/billing` shows a required checkbox (PT/ES/EN) accepting the Terms and the refund policy; every checkout button
  sends `termsAccepted: true`.
- `POST /api/billing/checkout` answers `400 invalid_input / terms_consent_required` without it, before any
  database or Stripe call.
- The acceptance is recorded in the Checkout Session metadata (and copied to the PaymentIntent / Subscription):
  `terms_accepted=true`, `terms_accepted_at` (ISO time), `terms_version`
  (`src/lib/billing/consent.ts` — bump it when the wording changes).
- Stripe Checkout restates the 7-day policy next to the pay button (`custom_text.submit`); Terms section 5 explains it.

## How entitlements are enforced

Nothing the browser sends decides what a user gets:

1. `POST /api/analyses` calls the database function `consume_analysis_credit(user)` with the service role.
   It takes a per-user advisory lock and consumes, in order: subscription quota for the current period → paid pack credits → free credits.
2. The function returns the tier (`free`/`full`) and the plan features, which are stored on the analysis row.
   Users cannot insert or update analyses, credits or subscriptions (RLS has no policy for that).
3. Cover letter / interview prep check the features stored on the analysis.
4. If an analysis fails after a credit was consumed, `refund_analysis_credit` gives it back (idempotent).

## Test mode setup (do this first)

1. Create a Stripe account and stay in **Test mode**.
2. Copy the test secret key into `STRIPE_SECRET_KEY=sk_test_...`.
3. Local webhooks with the Stripe CLI:
   ```bash
   stripe login
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
   Copy the printed `whsec_...` into `STRIPE_WEBHOOK_SECRET` and restart `npm run dev`.
4. Buy a pack on `/billing` with card `4242 4242 4242 4242`, any future date, any CVC.
   The webhook adds the credits; the billing page shows them.
5. Subscribe to Pro the same way, then open **Manage subscription** (Stripe customer portal) to cancel.
   Enable the customer portal once in Stripe: Settings → Billing → Customer portal.

Useful CLI triggers:

```bash
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
```

## Webhook events handled

Endpoint: `POST /api/stripe/webhook` (signature verified with `STRIPE_WEBHOOK_SECRET`).

| Event                                         | Effect                                                     |
|-----------------------------------------------|------------------------------------------------------------|
| `checkout.session.completed` (payment)        | Adds pack credits once per session (`external_ref` unique) |
| `checkout.session.async_payment_succeeded`    | Same as above for delayed payment methods                  |
| `checkout.session.completed` (subscription)   | Creates/updates the subscription row                       |
| `customer.subscription.created/updated/deleted` | Syncs status, period and cancel-at-period-end            |
| `charge.refunded` (pack)                      | Removes the refunded share of the pack credits (capped at the paid balance), once per charge |

Processing is idempotent: event ids are recorded in `stripe_events`, credits are keyed by checkout session id
and subscriptions are upserted per user. Returning 500 lets Stripe retry safely.

**Event order.** Stripe does not guarantee delivery order, so subscription events are never applied from their
payload: the handler re-reads the subscription from the Stripe API and stores that current snapshot. A late
`customer.subscription.updated` therefore cannot resurrect a canceled subscription, and an event about an old,
ended subscription never replaces a newer live one for the same user.

**Access rules.** Only `active`/`trialing` subscriptions with `current_period_end` in the future grant quota.
A declined renewal moves the subscription to `past_due` (no quota; remaining pack/free credits still work).
Cancel-at-period-end keeps access until the period ends. The subscription quota counts only analyses paid by the
subscription (`usage_events.credit_source = 'subscription'`), never those paid with pack or free credits.

**Plan switches.** Synced prices carry the lookup key `cvmatch_<plan id>`, and the webhook takes the plan from the
subscription's current price, so a switch made in the customer portal (e.g. quarterly → monthly) also switches the
quota. Prices created without a lookup key (no `stripe:sync`) fall back to the plan in the checkout metadata — in that
case turn off plan switching in the portal.

**Promotion codes.** Checkout allows promotion codes; a pack bought with a 100% code (`payment_status =
no_payment_required`) is granted like a paid one.

**Duplicate subscriptions.** Before creating a subscription checkout the server checks both the database and Stripe
(the webhook may not have arrived yet), so a second tab cannot start a second subscription.

**Refunds (Brazil, CDC art. 49: 7-day right of withdrawal).** Policy: full refund within 7 days of purchase if no
paid analysis was used, proportional to the unused analyses otherwise. Refund in the Stripe Dashboard (Payments →
Refund): `charge.refunded` removes the refunded share of the pack credits automatically (rounded up, capped at the
user's paid balance, once per charge). For a subscription, refund the first invoice and cancel the subscription —
`customer.subscription.deleted` ends Pro access. A second partial refund of the same charge, or a dispute
(`charge.dispute.created`), still needs a manual ledger adjustment:

```sql
-- remaining paid credits of the user (never take more than this)
select coalesce(sum(delta), 0) from public.credit_ledger where user_id = '<user id>' and credit_type = 'paid';
insert into public.credit_ledger (user_id, delta, credit_type, reason, external_ref)
values ('<user id>', -<credits>, 'paid', 'admin_adjustment', 'adjust:<stripe charge id>');
```

Refunding a subscription: cancel it in Stripe; the webhook removes the quota at once when the status becomes `canceled`.

## Tax

Prices are final (`tax_behavior = inclusive`). Stripe Tax does not support Brazil, so keep
`STRIPE_AUTOMATIC_TAX=false`. As an individual seller (CPF) there is no invoice (nota fiscal) and revenue is
declared through carnê-leão; opening an MEI/company allows issuing invoices — confirm with an accountant.

## Going live

1. Complete Stripe account activation (business details, bank account).
2. Set the legal operator details (`LEGAL_*` variables) — they appear on `/legal` and `/privacy`.
3. Configure tax (see above) and set `STRIPE_AUTOMATIC_TAX=true`.
4. Run `ENV_FILE=.env.production.local npm run stripe:sync` with the **live** key and the production database.
5. In Stripe **Live mode**, create a webhook endpoint `https://YOUR_DOMAIN/api/stripe/webhook`
   listening to the events above, and copy its signing secret.
6. Configure the customer portal in **Live mode** (it is separate from test mode): cancellation, payment method
   update and invoice history on; plan switching only between `pro_monthly` and `pro_quarterly`.
7. Replace `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` with the live values in your hosting provider and redeploy.
8. `ENV_FILE=.env.production.local npm run verify:keys` checks the key mode, webhook events and that every synced
   price exists in live mode with the database amount.
9. Do one real purchase with a real card and refund it from the Stripe dashboard.
