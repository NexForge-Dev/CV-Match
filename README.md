# CV Match

**Your CV, aligned with the right job.**

CV Match compares a candidate's CV with a specific job description, shows the evidence for every requirement,
and suggests targeted improvements — **without inventing experience, metrics, technologies, languages or results**.

- Interface in **Portuguese, Spanish and English**; generated content in the language the candidate chooses.
- Built first for tech professionals, graduates and candidates applying in Spain or internationally; the skill
  taxonomy and requirement extractor are data-driven, so new sectors and countries can be added without code changes.

> The compatibility index is an estimate computed by the tool. It is **not** a hiring probability,
> and CV Match does not promise interviews, ATS scores or job offers.

---

## Features

| Area | What it does |
|---|---|
| **Import** | Upload PDF or DOCX (size, extension, MIME type and file signature validated; files are only parsed, never executed) or paste text. Detects scanned PDFs, broken text layers and truncated text; optional OCR via HTTP adapter. |
| **Review** | Extracted contact, experience, education, skills, projects, languages and certifications are shown in an editable form; the reviewed data becomes the immutable **original version**. |
| **Job** | Paste the ad text (optional company, location, language, link). No scraping. Requirements are split into must-have / nice-to-have. |
| **Analysis** | Each requirement is classified as *Evidence found*, *Partial evidence*, *Not identified in CV* or *Ambiguous / not applicable*, with quotes from the CV as evidence. Absence from the document is explicitly distinguished from absence of the skill. |
| **Score** | Weighted average: must-have = 3, nice-to-have = 1; found = 1, partial = 0.5, not identified = 0; ambiguous excluded. Explained in the UI. |
| **Improvements** | Professional summary, skill ordering, adding skills already evidenced elsewhere in the CV, clearer bullets with the job's terminology, bullet/project ordering, items to **confirm before including**, and honest ways to address gaps. Accept, edit or reject each one. |
| **Versions** | Accepted changes create a **new version**; originals are never overwritten. Desktop editor with live preview and version diff. |
| **Export** | PDF and DOCX, two professional ATS-friendly single-column templates, section titles in PT/ES/EN. |
| **Extras** | Cover letter and interview preparation based only on facts from the CV (paid plans). Skill bank, profile and preferences. |
| **Account** | Sign up, email confirmation, login, password recovery, data export (JSON), deletion of documents, analyses, versions and the whole account. |
| **Billing** | Free (1 limited analysis), analysis packs and Pro subscription via Stripe Checkout + webhooks + customer portal. Prices/limits/benefits live in the database. |

## How "no invented facts" is enforced

1. **Deterministic matching.** Requirement evidence and the score come from a rule-based matcher over the CV text, not from a model, so results are explainable and reproducible.
2. **Fact guard.** Every suggestion (rule-based or AI) is checked against the CV: any new number/percentage or any technology not present in the CV is **discarded** (the user sees how many were dropped). Years of experience are only stated when computed from the CV's own dates.
3. **Grounding.** When an LLM parses a CV or a job ad, every extracted item must be found in the source text or it is dropped.
4. **Confirmation gate.** Missing requirements are never added automatically. The user must explicitly confirm (checkbox) before a missing skill can be added, and placeholders like `[number]` block applying a suggestion.
5. **Prompt-injection defences.** Documents are wrapped as untrusted data, delimiter look-alikes and invisible characters are stripped, instruction-like text is detected and reported, model output is schema-validated, and entitlements are decided only on the server.

## Tech stack

- **Next.js 15** (App Router, Route Handlers) + **React 19** + **TypeScript** (strict) + **Tailwind CSS**
- **Supabase**: Postgres with **Row Level Security** on every table, Auth (email/password, confirmation, recovery), private Storage bucket
- **Zod** validation on every API input and on model output
- **LLM abstraction** (`src/lib/ai`): `heuristic` provider (offline, free) and `anthropic` provider (Claude, structured outputs). Automatic fallback to the heuristic engine on any model error.
- **pdf-parse** / **mammoth** for extraction, **pdf-lib** / **docx** for export
- **Stripe** Checkout, Billing Portal and webhooks
- **Vitest** + **PGlite** (real Postgres in-process to test the migration and RLS)

## Quick start (local)

Requirements: Node.js 20+, Docker (for the local Supabase stack).

```bash
git clone https://github.com/NexForge-Dev/CV-Match.git
cd CV-Match
npm install

# 1. Start Supabase locally (applies supabase/migrations automatically)
npx supabase start
npx supabase status          # shows API URL, anon key and service role key

# 2. Configure the app
cp .env.example .env.local   # paste the Supabase URL and keys printed above

# 3. Run
npm run dev                  # http://localhost:3000
```

Local Supabase runs on ports **565xx** (see `supabase/config.toml`) to avoid clashing with other local projects.
Email confirmation is disabled locally; emails sent by Auth can be viewed in Mailpit (`npx supabase status` shows the URL).

Without `ANTHROPIC_API_KEY` the app runs fully on the deterministic engine. To use Claude:

```bash
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / server |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript (no emit) |
| `npm test` | Unit + integration tests (Vitest, PGlite) |
| `npm run check` | lint + typecheck + tests + build |
| `npm run smoke` | End-to-end test against a running app and Supabase (`BASE_URL=http://localhost:3000`) |

### What the tests cover

- PDF/DOCX extraction, corrupted files, spoofed/oversized uploads, scanned PDFs without OCR, OCR success and OCR failure
- CV parsing (PT/ES/EN headings), requirement extraction (must/nice, benefits ignored), all four evidence statuses, years and language levels, score formula
- Suggestions in three languages passing the fact guard; simulated LLM inventing metrics/technologies is filtered; cover letter fallback; model failure fallback
- Applying suggestions creates a new CV without mutating the original; confirmation and placeholder gates
- PDF and DOCX export round-trips (exported files are re-extracted and checked)
- Database: RLS isolation between two users, immutable versions, users cannot grant credits/subscriptions, credit consumption order and refunds, subscription quotas, account deletion cascade
- Stripe webhook idempotency, pack credits, subscription sync
- Log redaction and prompt-injection detection
- `npm run smoke`: the full HTTP flow with two real users (upload → review → job → analysis → limits → suggestions → apply → export → isolation → signed Stripe webhook → paid extras → deletions)

## Configuration

All variables are documented in [`.env.example`](./.env.example). Key ones:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Supabase connection |
| `AI_PROVIDER` (`heuristic`/`anthropic`), `ANTHROPIC_API_KEY`, `AI_MODEL` | AI provider |
| `UPLOAD_MAX_BYTES` | Upload limit (default 5 MB) |
| `STORE_ORIGINAL_FILES` | Keep original files in Storage (default `false`: parsed in memory and discarded) |
| `DOCUMENT_RETENTION_DAYS` | Retention for stored originals (daily cron) |
| `OCR_PROVIDER`, `OCR_HTTP_URL`, `OCR_HTTP_TOKEN` | Optional OCR adapter |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Payments (test keys first) |
| `CRON_SECRET` | Protects `/api/cron/cleanup` |

**Plans and prices** are rows in the `plans` table — see [docs/PAYMENTS.md](./docs/PAYMENTS.md).

## Project structure

```
src/
  app/
    page.tsx, privacy/, terms/          Landing and legal pages
    login/, signup/, forgot-password/, reset-password/, auth/   Authentication
    (app)/                              Authenticated app: dashboard, new, resumes, analyses, jobs,
                                        documents, profile, billing, account
    api/                                Route handlers (documents, resumes, versions, jobs, analyses,
                                        suggestions, export, billing, stripe/webhook, account, cron, ...)
  components/                           UI (wizard, analysis view, CV editor, preview, diff, marketing)
  lib/
    ai/          provider interface, heuristic + Anthropic providers, pipeline, fact guard, safety
    analysis/    taxonomy, requirement extraction, matching + score, suggestions, extras
    cv/          CV schema, parser, diff
    documents/   upload validation, text extraction, OCR adapter
    export/      PDF and DOCX renderers
    billing/     plans, Stripe client, webhook handler
    i18n/        PT/ES/EN dictionaries
    supabase/    browser, server and admin clients
supabase/migrations/   Schema, RLS policies, billing functions, seed plans, storage bucket
tests/                 Vitest suites (incl. PGlite database tests)
scripts/smoke-e2e.mjs  End-to-end smoke test
docs/                  Deployment and payments guides
```

## Security & privacy

- RLS on every table; ownership checked on every cross-table insert; analyses, credits, subscriptions and extras can only be written by the server.
- Users can update only specific columns (e.g. suggestion status/edits), enforced with column-level grants.
- Credits are consumed atomically in Postgres with a per-user advisory lock; failed analyses are refunded.
- Uploads: size limit, extension + MIME + magic-byte checks, sanitized filenames; files are never executed or served back as HTML.
- Logs contain ids, sizes, codes and durations only — never CV or job text (see `src/lib/log.ts`).
- Original files are not stored by default; when enabled they live in a private bucket and are purged by the retention cron.
- Rate limit for AI operations per user per minute (server-side).
- Security headers (`X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`).

The privacy policy and terms of use (`/privacy`, `/terms`) are **templates** and must be reviewed by a lawyer before launch.
No certified legal compliance is claimed.

## Deployment

See [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) (Vercel + Supabase Cloud + Stripe) and [docs/PAYMENTS.md](./docs/PAYMENTS.md).

### Before selling — checklist

1. Create a Supabase Cloud project, run `npx supabase db push`, set Auth URLs and a custom SMTP sender.
2. Create a Stripe account; complete the test-mode flow from `docs/PAYMENTS.md`; then switch to live keys and a live webhook.
3. Set the environment variables in your host (see `.env.example`).
4. Replace the placeholder contact email in the legal pages and have them reviewed.
5. Optionally enable `AI_PROVIDER=anthropic` for higher-quality parsing and wording.

## Known limitations

- With the `heuristic` provider, suggestions keep the CV's original wording language; translating CV content into another language requires the `anthropic` provider (section headings are always localized).
- OCR requires an external service behind the HTTP adapter.
- The rule-based requirement extractor is tuned for tech roles; other sectors work best with the `anthropic` provider or after extending `src/lib/analysis/taxonomy.ts`.

## License

Proprietary — all rights reserved.
