-- ---------------------------------------------------------------------------
-- Launch hardening
--   1. Atomic AI usage reservation: the per-minute, daily and per-analysis caps
--      were checked before the AI call and recorded after it, so parallel
--      requests could all pass the check. reserve_usage() counts and inserts
--      the usage row under the same per-user lock as credit consumption.
--   2. Uploads are always counted (the row is reserved before parsing, also
--      when no AI runs for a scanned or empty file).
--   3. Paid-credit features come from the active pack with a stable order.
--   4. Analyses whose function was killed (timeout) before refunding get their
--      credit back from the daily cron.
-- ---------------------------------------------------------------------------
create or replace function public.reserve_usage(
  p_user uuid,
  p_kind text,
  p_analysis uuid,
  p_per_minute integer,
  p_daily integer,
  p_per_analysis integer
) returns bigint
language plpgsql security definer set search_path = public as $$
declare
  ai_kinds text[] := array['analysis', 'parse_cv', 'extract_requirements', 'cover_letter', 'interview_prep'];
  n integer;
  ev_id bigint;
begin
  perform pg_advisory_xact_lock(hashtext('credits:' || p_user::text));

  select count(*) into n from public.usage_events
  where user_id = p_user and kind = any(ai_kinds) and created_at >= now() - interval '1 minute';
  if n >= p_per_minute then raise exception 'rate_limited' using errcode = 'P0001'; end if;

  select count(*) into n from public.usage_events
  where user_id = p_user and kind = any(ai_kinds) and created_at >= now() - interval '1 day';
  if n >= p_daily then raise exception 'usage_limit' using errcode = 'P0001'; end if;

  if p_analysis is not null and p_per_analysis is not null then
    select count(*) into n from public.usage_events
    where user_id = p_user and analysis_id = p_analysis and kind = p_kind;
    if n >= p_per_analysis then raise exception 'usage_limit' using errcode = 'P0001'; end if;
  end if;

  insert into public.usage_events (user_id, kind, analysis_id) values (p_user, p_kind, p_analysis) returning id into ev_id;
  return ev_id;
end $$;

revoke all on function public.reserve_usage(uuid, text, uuid, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.reserve_usage(uuid, text, uuid, integer, integer, integer) to service_role;

-- Refunds analyses that consumed a credit but never stored a result (e.g. the
-- serverless function was killed mid-request). Idempotent: the usage row is
-- deleted and the ledger refund is keyed by the consumed ledger row.
create or replace function public.reconcile_orphan_analyses(p_older_than interval default interval '15 minutes')
returns integer
language plpgsql security definer set search_path = public as $$
declare
  ev record;
  led record;
  refunded integer := 0;
begin
  for ev in
    select u.id, u.user_id, u.credit_source, u.created_at from public.usage_events u
    where u.kind = 'analysis' and u.analysis_id is null and u.created_at < now() - p_older_than
    for update skip locked
  loop
    if ev.credit_source in ('paid_credit', 'free_credit') then
      -- The matching consumption is the ledger row written in the same transaction.
      select l.id into led from public.credit_ledger l
      where l.user_id = ev.user_id and l.reason = 'analysis' and l.created_at = ev.created_at
        and l.credit_type = case ev.credit_source when 'paid_credit' then 'paid' else 'free' end
      order by l.id desc limit 1;
      if found then
        perform public.refund_analysis_credit(ev.user_id, ev.id, led.id);
      else
        delete from public.usage_events where id = ev.id;
      end if;
    else
      delete from public.usage_events where id = ev.id;
    end if;
    refunded := refunded + 1;
  end loop;
  return refunded;
end $$;

revoke all on function public.reconcile_orphan_analyses(interval) from public, anon, authenticated;
grant execute on function public.reconcile_orphan_analyses(interval) to service_role;

-- Same function as in 20261028000003_hardening.sql; only the pack features lookup changes
-- (active packs, stable order) because pack_5 and pack_10 now share sort = 1.
create or replace function public.consume_analysis_credit(p_user uuid)
returns table (allowed boolean, tier text, source text, usage_event_id bigint, ledger_id bigint, features jsonb)
language plpgsql security definer set search_path = public as $$
declare
  sub record;
  used integer;
  balance integer;
  ev_id bigint;
  led_id bigint;
  plan_features jsonb;
begin
  perform pg_advisory_xact_lock(hashtext('credits:' || p_user::text));

  select s.*, p.analyses_included, p.features as pfeatures into sub
  from public.subscriptions s join public.plans p on p.id = s.plan_id
  where s.user_id = p_user and s.status in ('active', 'trialing') and s.current_period_end > now();

  if found then
    select count(*) into used from public.usage_events
    where user_id = p_user and kind = 'analysis' and credit_source = 'subscription'
      and created_at >= coalesce(sub.current_period_start, now() - interval '1 month');
    if used < sub.analyses_included then
      insert into public.usage_events (user_id, kind, credit_source) values (p_user, 'analysis', 'subscription') returning id into ev_id;
      return query select true, 'full'::text, 'subscription'::text, ev_id, null::bigint, sub.pfeatures;
      return;
    end if;
  end if;

  select coalesce(sum(delta), 0) into balance from public.credit_ledger where user_id = p_user and credit_type = 'paid';
  if balance > 0 then
    insert into public.credit_ledger (user_id, delta, credit_type, reason) values (p_user, -1, 'paid', 'analysis') returning id into led_id;
    insert into public.usage_events (user_id, kind, credit_source) values (p_user, 'analysis', 'paid_credit') returning id into ev_id;
    select p.features into plan_features from public.plans p where p.kind = 'pack' order by p.active desc, p.sort, p.id limit 1;
    return query select true, 'full'::text, 'paid_credit'::text, ev_id, led_id, coalesce(plan_features, '{}'::jsonb);
    return;
  end if;

  select coalesce(sum(delta), 0) into balance from public.credit_ledger where user_id = p_user and credit_type = 'free';
  if balance > 0 then
    insert into public.credit_ledger (user_id, delta, credit_type, reason) values (p_user, -1, 'free', 'analysis') returning id into led_id;
    insert into public.usage_events (user_id, kind, credit_source) values (p_user, 'analysis', 'free_credit') returning id into ev_id;
    select p.features into plan_features from public.plans p where p.id = 'free';
    return query select true, 'free'::text, 'free_credit'::text, ev_id, led_id, coalesce(plan_features, '{}'::jsonb);
    return;
  end if;

  return query select false, null::text, 'no_credits'::text, null::bigint, null::bigint, '{}'::jsonb;
end $$;

revoke all on function public.consume_analysis_credit(uuid) from public, anon, authenticated;
grant execute on function public.consume_analysis_credit(uuid) to service_role;
