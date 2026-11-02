# Deployment

Recommended: **Vercel** (Next.js) + **Supabase Cloud** (Postgres, Auth, Storage) + **Stripe**.
Any Node.js 20+ host that runs `next start` works as well.

## 1. Supabase project

1. Create a project at https://supabase.com (choose an EU region for EU users, e.g. Frankfurt or Paris).
2. Apply the migrations:
   ```bash
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   npx supabase db push
   ```
   This creates all tables, RLS policies, billing functions, the seeded plans and the private
   `cv-originals` storage bucket. Migrations in `supabase/migrations/` are applied in filename order;
   never edit an applied migration — add a new file (e.g. `20261028000003_hardening.sql`).
3. Authentication → URL configuration:
   - Site URL: `https://YOUR_DOMAIN`
   - Redirect URLs: `https://YOUR_DOMAIN/auth/callback`
4. Authentication → Providers → Email: keep **Confirm email** enabled and set the minimum password length to **8**
   (the forms require 8). Every new account gets a free analysis, so also enable **CAPTCHA protection**
   (Authentication → Attack protection, e.g. Cloudflare Turnstile) to stop scripted sign-ups.
   Configure a custom SMTP sender (Authentication → Emails → SMTP) before launch; the built-in sender is rate-limited.
5. Copy from Project Settings → API: the project URL, the `anon` key and the `service_role` key.

## 2. Stripe

Follow [PAYMENTS.md](./PAYMENTS.md). Start in test mode; switch keys to live only after a full test run.

## 3. Vercel

1. Import the GitHub repository in Vercel (framework preset: Next.js).
2. Set environment variables (Production and Preview):

   | Variable | Value |
   |---|---|
   | `NEXT_PUBLIC_APP_URL` | `https://YOUR_DOMAIN` |
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (secret) |
   | `ANTHROPIC_API_KEY` | optional — when set, Claude is used automatically |
   | `AI_PROVIDER` | optional — `heuristic` forces the free rule-based engine |
   | `STRIPE_SECRET_KEY` | `sk_test_...` then `sk_live_...` |
   | `STRIPE_WEBHOOK_SECRET` | from the Stripe webhook endpoint |
   | `CRON_SECRET` | random string (`openssl rand -hex 32`) |
   | `STORE_ORIGINAL_FILES` | `false` (recommended) |
   | `STRIPE_AUTOMATIC_TAX` | `true` once Stripe Tax is enabled (see PAYMENTS.md) |
   | `LEGAL_OPERATOR_NAME`, `LEGAL_OPERATOR_TAX_ID`, `LEGAL_OPERATOR_ADDRESS`, `LEGAL_CONTACT_EMAIL` | the provider's legal name, NIF, postal address and contact email (shown on `/legal` and `/privacy`) |
   | `LEGAL_BACKUP_RETENTION_DAYS` | days deleted data may remain in backups (Supabase Pro: `7`) |

3. Deploy. `vercel.json` schedules `/api/cron/cleanup` daily; Vercel sends `Authorization: Bearer $CRON_SECRET` automatically.
   The cron also gives back credits of analyses whose function was killed before finishing (older than 15 minutes).
   `NEXT_PUBLIC_*` values are baked in at build time: redeploy after changing them.
4. Add your domain and update `NEXT_PUBLIC_APP_URL`, the Supabase Site URL/redirects and the Stripe webhook URL.

## 4. Monitoring, backups and recovery

- **AI spend:** set a monthly spend limit in the Anthropic Console. Per user, the app caps AI calls per minute
  (`AI_RATE_LIMIT_PER_MINUTE`, default 10) and per day (`AI_DAILY_LIMIT`, default 40); the caps are reserved atomically in
  the database, so parallel requests cannot exceed them.
- **Health check:** `GET /api/health` returns `{"ok": true, "database": true, "config": true}` (HTTP 200) or 503 (`config: false` = the server env does not validate, e.g. an empty `SUPABASE_SERVICE_ROLE_KEY`). It exposes no
  versions, keys or user data — point your uptime monitor at it.
- **Logs:** structured JSON with ids, codes, sizes and durations only (`src/lib/log.ts` redacts content).
- **Backups:** Supabase takes daily backups on paid plans; enable **Point-in-Time Recovery** for production.
  Test a restore into a separate project before launch. Stripe remains the source of truth for payments:
  after a restore, replay recent events from the Stripe dashboard (Developers → Events → Resend) — the
  webhook is idempotent.
- **Deleted accounts and backups:** deleting an account removes its rows and stored files immediately, but copies
  may remain in database backups until they expire under your backup retention. State this in the privacy policy;
  do not promise immediate erasure from backups.
- **Keys:** keep test and live Stripe keys in separate environments (Preview = test, Production = live). Rotate
  `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_*` and `CRON_SECRET` if they are ever exposed. Only `NEXT_PUBLIC_*`
  variables reach the browser.

## 5. Post-deploy checklist

- [ ] `vercel env pull .env.production.local && ENV_FILE=.env.production.local npm run verify:keys` reports no blocking issues
      (keys valid, migrations applied, private bucket, Stripe mode and webhook endpoint, Claude reachable).
- [ ] `GET https://YOUR_DOMAIN/api/health` returns `{"ok":true,"database":true,"config":true}`.

- [ ] Sign up with a new email, confirm it, log in.
- [ ] Upload a PDF and a DOCX CV; paste a job; run the free analysis.
- [ ] Accept suggestions → new version created; export PDF and DOCX.
- [ ] Buy a pack in test mode → credits appear; run a full analysis; generate cover letter and interview prep.
- [ ] Subscribe to Pro in test mode → open the customer portal → cancel.
- [ ] Delete a document, an analysis, then the whole account.
- [ ] Check Vercel logs: entries contain ids and codes only, never CV text.

## Optional: AI provider

Setting `ANTHROPIC_API_KEY` switches to Claude: `AI_MODEL_EXTRACT` (default `claude-haiku-5-5`) for CV parsing and
requirement extraction, `AI_MODEL_WRITE` (default `claude-sonnet-5-5`) for suggestion wording, cover letters and interview prep.
Requirement matching and the score stay deterministic, and every model output passes the same
grounding and fact checks as the rule-based engine. If the API fails, the app falls back to the rule-based engine.
Each full analysis costs about €0.10 of API usage (see docs/PAYMENTS.md); token counts are recorded in `usage_events` (no content).

## Optional: OCR for scanned PDFs

Set `OCR_PROVIDER=http`, `OCR_HTTP_URL` and optionally `OCR_HTTP_TOKEN`. The app POSTs the raw PDF
(`content-type: application/pdf`) and expects `{"text": "..."}`. Any OCR service can sit behind a small adapter
(e.g. a Tesseract container or a cloud vision API). Without OCR, scanned PDFs are detected and the user is asked to paste text.
