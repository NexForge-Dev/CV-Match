# Payments (Stripe)

CV Match sells two kinds of products through **Stripe Checkout**:

| Plan id       | Kind           | Default price | What it grants                                      |
|---------------|----------------|---------------|-----------------------------------------------------|
| `free`        | free           | €0            | 1 analysis on signup, max 5 suggestions, no extras   |
| `pack_5`      | one-time pack  | €7            | 5 full analyses (paid credits, never expire)         |
| `pro_monthly` | subscription   | €12 / month   | 40 full analyses per billing period                  |

Prices are **hypothetical starting values**. They live in the `plans` table, not in code.

## Changing prices, limits and benefits (no code change)

Edit the `plans` row in the Supabase dashboard (Table editor) or with SQL:

```sql
update public.plans set price_cents = 900, analyses_included = 8 where id = 'pack_5';
update public.plans set features = features || '{"max_suggestions": 3}' where id = 'free';
update public.plans set active = false where id = 'pro_monthly';         -- hide a plan
insert into public.plans (id, name, kind, price_cents, currency, billing_interval, analyses_included, features, sort)
values ('pro_yearly', 'Pro (yearly)', 'subscription', 9900, 'eur', 'year', 500,
        '{"max_suggestions": null, "cover_letter": true, "interview_prep": true, "export_docx": true, "export_pdf": true}', 3);
```

- Checkout builds the Stripe price **from the database row** (`price_data`), so the landing page, billing page and checkout always agree.
- If you prefer Stripe-managed prices (e.g. for tax settings or coupons on specific prices), create the Price in Stripe and put its id in `plans.stripe_price_id`; that price is then used instead.
- `features` keys: `max_suggestions` (number or null = unlimited), `cover_letter`, `interview_prep`, `export_pdf`, `export_docx`.
- The free plan's `analyses_included` is the number of free credits granted on signup.

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

Processing is idempotent: event ids are recorded in `stripe_events`, credits are keyed by checkout session id
and subscriptions are upserted per user. Returning 500 lets Stripe retry safely.

## Going live

1. Complete Stripe account activation (business details, bank account).
2. Review the legal pages (`/terms`, `/privacy`) with a lawyer — they are templates.
3. Configure tax (Stripe Tax or your own approach) — VAT applies to digital services sold in the EU.
4. In Stripe **Live mode**, create a webhook endpoint `https://YOUR_DOMAIN/api/stripe/webhook`
   listening to the events above, and copy its signing secret.
5. Replace `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` with the live values in your hosting provider.
6. Do one real purchase with a real card and refund it from the Stripe dashboard.
