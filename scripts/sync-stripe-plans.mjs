#!/usr/bin/env node
/**
 * Mirrors the `plans` table into Stripe Products/Prices and stores each price id
 * in `plans.stripe_price_id`. Idempotent: run it again after changing a price.
 *
 *   npm run stripe:sync                  # reads .env.local / .env
 *   ENV_FILE=.env.production.local npm run stripe:sync
 *
 * - One Product per plan (id `cvmatch_<plan id>`), archived when the plan is inactive.
 * - Stripe prices are immutable: when amount/interval change, a new Price is created,
 *   takes over the lookup key `cvmatch_<plan id>` and the old one is archived.
 *   Existing subscribers keep their old price until they change plan.
 * - Prices are final, tax-inclusive consumer prices (tax_behavior = inclusive).
 * Price ids differ between test and live mode, so run it once per environment.
 */
import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

// ENV_FILE is exclusive: never mix a live Stripe key with the local database (or the reverse).
for (const file of process.env.ENV_FILE ? [process.env.ENV_FILE] : [".env.local", ".env"]) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
}
const E = process.env;
for (const key of ["STRIPE_SECRET_KEY", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]) {
  if (!E[key]) {
    console.error(`Missing ${key}`);
    process.exit(1);
  }
}

const stripe = new Stripe(E.STRIPE_SECRET_KEY);
const db = createClient(E.NEXT_PUBLIC_SUPABASE_URL, E.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
console.log(`Stripe ${E.STRIPE_SECRET_KEY.includes("_live_") ? "LIVE" : "test"} mode → ${E.NEXT_PUBLIC_SUPABASE_URL}\n`);
try {
  await stripe.products.list({ limit: 1 });
} catch (err) {
  console.error(`Stripe rejected STRIPE_SECRET_KEY: ${err?.message ?? err}`);
  process.exit(1);
}

const recurringOf = (interval) =>
  interval === "quarter" ? { interval: "month", interval_count: 3 } : { interval: interval ?? "month", interval_count: 1 };

const { data: plans, error } = await db.from("plans").select("*").neq("kind", "free").order("sort");
if (error) throw error;

for (const plan of plans) {
  const productId = `cvmatch_${plan.id}`;
  const lookupKey = `cvmatch_${plan.id}`;
  const productName = `CV Match — ${plan.name}`;

  let product = await stripe.products.retrieve(productId).catch((err) => {
    if (err?.code === "resource_missing") return null;
    throw err;
  });

  if (!plan.active) {
    if (product?.active) await stripe.products.update(productId, { active: false });
    console.log(`  - ${plan.id}: inactive (product archived)`);
    continue;
  }

  const productFields = { name: productName, metadata: { plan_id: plan.id }, tax_code: "txcd_10000000" };
  product = product
    ? await stripe.products.update(productId, { ...productFields, active: true })
    : await stripe.products.create({ id: productId, ...productFields });

  const recurring = plan.kind === "subscription" ? recurringOf(plan.billing_interval) : null;
  const { data: existing } = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
  const current = existing[0];
  const matches =
    current &&
    current.product === productId &&
    current.unit_amount === plan.price_cents &&
    current.currency === plan.currency &&
    (recurring
      ? current.recurring?.interval === recurring.interval && current.recurring?.interval_count === recurring.interval_count
      : !current.recurring);

  let price = current;
  if (!matches) {
    price = await stripe.prices.create({
      product: productId,
      currency: plan.currency,
      unit_amount: plan.price_cents,
      tax_behavior: "inclusive",
      lookup_key: lookupKey,
      transfer_lookup_key: true,
      metadata: { plan_id: plan.id },
      ...(recurring ? { recurring } : {}),
    });
    if (current) await stripe.prices.update(current.id, { active: false });
  }
  if (product.default_price !== price.id) await stripe.products.update(productId, { default_price: price.id });

  if (plan.stripe_price_id !== price.id) {
    const { error: upd } = await db.from("plans").update({ stripe_price_id: price.id }).eq("id", plan.id);
    if (upd) throw upd;
  }
  const every = recurring ? ` every ${recurring.interval_count > 1 ? `${recurring.interval_count} ` : ""}${recurring.interval}` : " one-time";
  console.log(`  ✓ ${plan.id}: ${(plan.price_cents / 100).toFixed(2)} ${plan.currency.toUpperCase()}${every} → ${price.id}${matches ? " (unchanged)" : " (new)"}`);
}
