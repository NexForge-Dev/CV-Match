#!/usr/bin/env node
/**
 * Launch readiness: checks that the configured keys actually work, without
 * charging anyone or changing data.
 *
 *   npm run verify:keys                  # reads .env.local / .env
 *   vercel env pull .env.production.local && ENV_FILE=.env.production.local npm run verify:keys
 *
 * - Supabase: anon + service role keys valid, all migrations applied.
 * - Anthropic (if a key is set): one tiny request with the exact options the app uses.
 * - Stripe: key valid, test/live mode consistent with the app URL, webhook endpoint
 *   registered for this app with the events the app needs.
 * Exit code 1 if anything blocks a launch.
 */
import { existsSync, readFileSync } from "node:fs";

// ENV_FILE is exclusive, so production checks never pick up local values.
for (const file of process.env.ENV_FILE ? [process.env.ENV_FILE] : [".env.local", ".env"]) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
}
const E = process.env;
let blockers = 0;
const ok = (msg) => console.log(`  ✓ ${msg}`);
const warn = (msg) => console.log(`  ! ${msg}`);
const fail = (msg) => {
  blockers++;
  console.log(`  ✗ ${msg}`);
};
const errMsg = (err) => (err instanceof Error ? err.message : String(err)).slice(0, 200);

const appUrl = E.NEXT_PUBLIC_APP_URL ?? "";
const isLocal = !appUrl || /localhost|127\.0\.0\.1/.test(appUrl);
console.log(`CV Match launch check — app URL: ${appUrl || "(not set)"}\n`);

// ---------- App ----------
console.log("App");
if (!appUrl) fail("NEXT_PUBLIC_APP_URL is not set (used for Stripe and email redirects)");
else if (isLocal) warn("NEXT_PUBLIC_APP_URL points to localhost — set your public https domain in production");
else if (!appUrl.startsWith("https://")) fail("NEXT_PUBLIC_APP_URL must use https in production");
else ok("public https URL");
if (!E.CRON_SECRET || E.CRON_SECRET.length < 16) fail("CRON_SECRET missing or too short (use: openssl rand -hex 32)");
else ok("CRON_SECRET set");
// Shown on /legal and /privacy (LGPD art. 9; Decreto 7.962/2013 art. 2: name, CPF/CNPJ, physical and e-mail address).
const legalMissing = ["LEGAL_OPERATOR_NAME", "LEGAL_OPERATOR_TAX_ID", "LEGAL_OPERATOR_ADDRESS", "LEGAL_CONTACT_EMAIL"].filter((k) => !E[k]?.trim());
if (legalMissing.length && !isLocal) fail(`legal pages incomplete — set ${legalMissing.join(", ")}`);
else if (legalMissing.length) warn(`legal operator details not set (${legalMissing.join(", ")}) — required in production`);
else ok("legal operator details set");

// ---------- Supabase ----------
console.log("\nSupabase");
const { createClient } = await import("@supabase/supabase-js");
if (!E.NEXT_PUBLIC_SUPABASE_URL || !E.NEXT_PUBLIC_SUPABASE_ANON_KEY || !E.SUPABASE_SERVICE_ROLE_KEY) {
  fail("NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are required");
} else {
  try {
    const anon = createClient(E.NEXT_PUBLIC_SUPABASE_URL, E.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
    const { data: plans, error } = await anon.from("plans").select("id, kind, price_cents, currency, active").eq("active", true).order("sort");
    if (error) throw error;
    ok(`anon key works — active plans: ${plans.map((p) => `${p.id} (${(p.price_cents / 100).toFixed(2)} ${p.currency})`).join(", ")}`);
    const admin = createClient(E.NEXT_PUBLIC_SUPABASE_URL, E.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const { error: migErr } = await admin.from("usage_events").select("credit_source").limit(1);
    // reconcile_orphan_analyses comes from the latest migration; with a 100-year window it changes nothing.
    const { error: fnErr } = await admin.rpc("reconcile_orphan_analyses", { p_older_than: "100 years" });
    if (migErr || fnErr) fail(`latest migration not applied (run: npx supabase db push) — ${(migErr ?? fnErr).message}`);
    else ok("service role key works; all migrations applied");
    try {
      const res = await fetch(`${E.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: E.NEXT_PUBLIC_SUPABASE_ANON_KEY } });
      const settings = await res.json();
      if (settings.mailer_autoconfirm && !isLocal) fail("Auth: email confirmation is OFF — enable \"Confirm email\" (free credits could be farmed)");
      else if (settings.mailer_autoconfirm) warn("Auth: email confirmation is off (fine locally)");
      else ok("Auth: email confirmation required");
    } catch (err) {
      warn(`could not read Auth settings — ${errMsg(err)}`);
    }
    const { data: bucket } = await admin.storage.getBucket("cv-originals");
    if (bucket && bucket.public) fail("storage bucket cv-originals is PUBLIC — make it private");
    else if (bucket) ok("storage bucket cv-originals is private");
    else warn("storage bucket cv-originals not found (only needed with STORE_ORIGINAL_FILES=true)");
    if (/127\.0\.0\.1|localhost/.test(E.NEXT_PUBLIC_SUPABASE_URL) && !isLocal) fail("Supabase URL is local but the app URL is public");
  } catch (err) {
    fail(`Supabase not reachable or keys invalid — ${errMsg(err)}`);
  }
}

// ---------- Anthropic ----------
console.log("\nAI (Anthropic)");
const aiMode = E.AI_PROVIDER || (E.ANTHROPIC_API_KEY ? "anthropic" : "heuristic");
if (aiMode === "heuristic" || !E.ANTHROPIC_API_KEY) {
  warn("no ANTHROPIC_API_KEY (or AI_PROVIDER=heuristic): the free rule-based engine is used — the app works, without AI wording/translation");
} else {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey: E.ANTHROPIC_API_KEY, maxRetries: 1, timeout: 60_000 });
  for (const model of new Set([E.AI_MODEL_EXTRACT || "claude-haiku-5-5", E.AI_MODEL_WRITE || "claude-sonnet-5-5"])) {
    try {
      // Same request options as src/lib/ai/anthropic.ts, so a 400 here means the app's calls would fail too.
      const res = await client.beta.messages.create({
        model,
        max_tokens: 256,
        ...(model.includes("haiku") ? {} : { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" }),
        output_config: { effort: "low" },
        messages: [{ role: "user", content: "Reply with the single word OK." }],
      });
      const text = res.content.filter((b) => b.type === "text").map((b) => b.text).join("").trim();
      if (res.stop_reason === "refusal") fail(`model ${model} refused the test prompt`);
      else ok(`key valid; ${res.model} answered "${text.slice(0, 20)}" (${res.usage.input_tokens}+${res.usage.output_tokens} tokens)`);
    } catch (err) {
      fail(`Anthropic request failed for model ${model} — ${errMsg(err)} (the app would silently fall back to the rule-based engine)`);
    }
  }
}

// ---------- Stripe ----------
console.log("\nPayments (Stripe)");
const sk = E.STRIPE_SECRET_KEY ?? "";
if (!/^(sk|rk)_(test|live)_/.test(sk) || sk.includes("placeholder") || sk === "sk_test_") {
  fail("STRIPE_SECRET_KEY not set — checkout is disabled");
} else {
  const live = sk.includes("_live_");
  if (live && isLocal) fail("live Stripe key with a localhost app URL — use test keys locally");
  else if (!live && !isLocal) warn("TEST Stripe key on a public URL — fine for a soft launch, switch to live keys to take real payments");
  else ok(`${live ? "LIVE" : "TEST"} mode key`);
  if (!/^whsec_.{10,}/.test(E.STRIPE_WEBHOOK_SECRET ?? "") || (E.STRIPE_WEBHOOK_SECRET ?? "").includes("local")) fail("STRIPE_WEBHOOK_SECRET not set (from the webhook endpoint or `stripe listen`)");
  else ok("webhook signing secret set");
  try {
    const { default: Stripe } = await import("stripe");
    const stripe = new Stripe(sk);
    const account = await stripe.accounts.retrieve();
    ok(`key valid — account ${account.id}${account.charges_enabled ? "" : " (charges NOT enabled yet: finish account activation)"}`);
    if (live && !account.charges_enabled) fail("live account cannot take payments yet — complete Stripe activation");
    if (live && E.STRIPE_AUTOMATIC_TAX !== "true") warn("STRIPE_AUTOMATIC_TAX is off: no VAT is calculated on invoices — enable Stripe Tax before taking EU payments");

    // Every synced price must exist in this mode and match the database price.
    if (E.NEXT_PUBLIC_SUPABASE_URL && E.SUPABASE_SERVICE_ROLE_KEY) {
      const admin = createClient(E.NEXT_PUBLIC_SUPABASE_URL, E.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
      const { data: paid } = await admin.from("plans").select("id, price_cents, currency, stripe_price_id").eq("active", true).neq("kind", "free");
      for (const plan of paid ?? []) {
        if (!plan.stripe_price_id) {
          warn(`plan ${plan.id}: no stripe_price_id — checkout builds the price from the database (run npm run stripe:sync)`);
          continue;
        }
        try {
          const price = await stripe.prices.retrieve(plan.stripe_price_id);
          if (price.livemode !== live) fail(`plan ${plan.id}: price ${price.id} is a ${price.livemode ? "LIVE" : "TEST"} price but the key is ${live ? "LIVE" : "TEST"} (run npm run stripe:sync with this key)`);
          else if (!price.active || price.unit_amount !== plan.price_cents || price.currency !== plan.currency) fail(`plan ${plan.id}: Stripe price ${price.id} (${price.unit_amount} ${price.currency}, active=${price.active}) does not match the database (${plan.price_cents} ${plan.currency}) — run npm run stripe:sync`);
          else ok(`plan ${plan.id}: Stripe price matches (${(plan.price_cents / 100).toFixed(2)} ${plan.currency})`);
        } catch (err) {
          fail(`plan ${plan.id}: price ${plan.stripe_price_id} not found with this key — ${errMsg(err)}`);
        }
      }
    }
    if (!isLocal) {
      const needed = ["checkout.session.completed", "checkout.session.async_payment_succeeded", "customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted", "charge.refunded", "charge.dispute.created"];
      const url = `${appUrl.replace(/\/$/, "")}/api/stripe/webhook`;
      const endpoints = await stripe.webhookEndpoints.list({ limit: 100 });
      const ep = endpoints.data.find((e) => e.url === url && e.status === "enabled");
      if (!ep) fail(`no enabled Stripe webhook endpoint for ${url}`);
      else {
        const missing = ep.enabled_events.includes("*") ? [] : needed.filter((n) => !ep.enabled_events.includes(n));
        if (missing.length) fail(`webhook endpoint is missing events: ${missing.join(", ")}`);
        else ok(`webhook endpoint registered with all required events`);
      }
    } else {
      warn("local URL: use `stripe listen --forward-to localhost:3000/api/stripe/webhook` for webhooks");
    }
  } catch (err) {
    fail(`Stripe key rejected — ${errMsg(err)}`);
  }
}

console.log(blockers ? `\n${blockers} blocking issue(s). Fix them before launch.` : "\nNo blocking issues found by this check.");
process.exit(blockers ? 1 : 0);
