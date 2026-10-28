-- CV Match — security & billing hardening found in the pre-launch audit.

-- ---------------------------------------------------------------------------
-- 1. storage_path is server-managed. If users could write it, the retention
--    cron / delete routes (service role) could be pointed at another user's
--    file. Users keep the ability to clear their own extracted text.
-- ---------------------------------------------------------------------------
revoke update on public.documents from authenticated;
grant update (extracted_text) on public.documents to authenticated;

-- ---------------------------------------------------------------------------
-- 2. A version may only reference an analysis owned by the same user.
-- ---------------------------------------------------------------------------
drop policy versions_insert on public.resume_versions;
create policy versions_insert on public.resume_versions for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.resumes r where r.id = resume_id and r.user_id = auth.uid())
    and (analysis_id is null or exists (select 1 from public.analyses a where a.id = analysis_id and a.user_id = auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- 3. Subscription quota must only count analyses paid by the subscription.
--    Previously analyses paid with pack/free credits during the period also
--    consumed the monthly quota.
-- ---------------------------------------------------------------------------
alter table public.usage_events add column credit_source text
  check (credit_source in ('subscription', 'paid_credit', 'free_credit'));

-- Backfill: analyses usage rows linked to a stored analysis take its credit source.
update public.usage_events u
set credit_source = a.credit_source
from public.analyses a
where u.analysis_id = a.id and u.kind = 'analysis' and a.credit_source in ('subscription', 'paid_credit', 'free_credit');

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
    select p.features into plan_features from public.plans p where p.kind = 'pack' order by p.sort limit 1;
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

create or replace function public.credit_summary()
returns table (free_credits integer, paid_credits integer, plan_id text, subscription_status text, period_end timestamptz, period_used integer, period_included integer)
language sql stable security definer set search_path = public as $$
  select
    (select coalesce(sum(delta), 0)::int from public.credit_ledger where user_id = auth.uid() and credit_type = 'free'),
    (select coalesce(sum(delta), 0)::int from public.credit_ledger where user_id = auth.uid() and credit_type = 'paid'),
    s.plan_id,
    s.status,
    s.current_period_end,
    (select count(*)::int from public.usage_events u where u.user_id = auth.uid() and u.kind = 'analysis'
       and u.credit_source = 'subscription'
       and s.current_period_start is not null and u.created_at >= s.current_period_start),
    p.analyses_included
  from (select 1) one
  left join public.subscriptions s on s.user_id = auth.uid()
  left join public.plans p on p.id = s.plan_id;
$$;

revoke all on function public.consume_analysis_credit(uuid) from public, anon, authenticated;
grant execute on function public.consume_analysis_credit(uuid) to service_role;
revoke all on function public.credit_summary() from public, anon;
grant execute on function public.credit_summary() to authenticated;
