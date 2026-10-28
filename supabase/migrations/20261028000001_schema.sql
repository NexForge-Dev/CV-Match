-- CV Match — core schema, row level security and billing functions.
-- Every user-owned row carries user_id -> auth.users(id) ON DELETE CASCADE,
-- so deleting the auth user removes all of their data.

-- gen_random_uuid() is built into Postgres 13+.

-- ---------------------------------------------------------------------------
-- Profiles & skill bank
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 200),
  headline text not null default '' check (char_length(headline) <= 200),
  location text not null default '' check (char_length(location) <= 200),
  target_locations text[] not null default '{}',
  sector text not null default 'tech',
  ui_locale text not null default 'pt' check (ui_locale in ('pt', 'es', 'en')),
  cv_language text not null default 'pt' check (cv_language in ('pt', 'es', 'en')),
  cv_template text not null default 'modern' check (cv_template in ('classic', 'modern')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profile_skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  level text not null default '' check (char_length(level) <= 40),
  confirmed boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index profile_skills_user_name on public.profile_skills (user_id, lower(name));

-- ---------------------------------------------------------------------------
-- Documents, resumes and immutable versions
-- ---------------------------------------------------------------------------
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null check (char_length(file_name) <= 200),
  mime_type text not null,
  kind text not null check (kind in ('pdf', 'docx', 'text')),
  size_bytes integer not null check (size_bytes >= 0),
  storage_path text,
  extracted_text text check (char_length(extracted_text) <= 80000),
  extraction_status text not null check (extraction_status in ('ok', 'low_text', 'needs_ocr', 'failed')),
  extraction_method text not null default 'none',
  extraction_warnings jsonb not null default '[]',
  injection_suspected boolean not null default false,
  original_deleted_at timestamptz,
  created_at timestamptz not null default now()
);
create index documents_user on public.documents (user_id, created_at desc);

create table public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'CV' check (char_length(title) <= 200),
  language text not null default 'pt' check (language in ('pt', 'es', 'en')),
  template text not null default 'modern' check (template in ('classic', 'modern')),
  source_document_id uuid references public.documents(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index resumes_user on public.resumes (user_id, updated_at desc);

create table public.resume_versions (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid not null references public.resumes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  label text not null default '' check (char_length(label) <= 200),
  origin text not null check (origin in ('import', 'manual', 'suggestions', 'duplicate')),
  analysis_id uuid,
  data jsonb not null,
  created_at timestamptz not null default now(),
  unique (resume_id, version_number)
);
create index resume_versions_resume on public.resume_versions (resume_id, version_number desc);

-- ---------------------------------------------------------------------------
-- Jobs, analyses, suggestions, extras, exports
-- ---------------------------------------------------------------------------
create table public.job_descriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '' check (char_length(title) <= 200),
  company text not null default '' check (char_length(company) <= 200),
  location text not null default '' check (char_length(location) <= 200),
  language text not null default 'en' check (language in ('pt', 'es', 'en')),
  url text not null default '' check (char_length(url) <= 1000),
  raw_text text not null check (char_length(raw_text) between 30 and 30000),
  requirements jsonb not null default '[]',
  saved boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index job_descriptions_user on public.job_descriptions (user_id, created_at desc);

create table public.analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  resume_id uuid not null references public.resumes(id) on delete cascade,
  resume_version_id uuid not null references public.resume_versions(id) on delete cascade,
  job_id uuid not null references public.job_descriptions(id) on delete cascade,
  language text not null check (language in ('pt', 'es', 'en')),
  score integer check (score between 0 and 100),
  score_breakdown jsonb not null default '{}',
  requirements jsonb not null default '[]',
  results jsonb not null default '[]',
  provider text not null,
  tier text not null check (tier in ('free', 'full')),
  features jsonb not null default '{}',
  credit_source text not null,
  dropped_suggestions integer not null default 0,
  created_at timestamptz not null default now()
);
create index analyses_user on public.analyses (user_id, created_at desc);

alter table public.resume_versions
  add constraint resume_versions_analysis_fk foreign key (analysis_id) references public.analyses(id) on delete set null;

create table public.suggestions (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  position integer not null default 0,
  kind text not null,
  section text not null,
  target_ref jsonb,
  original_text text not null default '',
  suggested_text text not null default '',
  edited_text text check (char_length(edited_text) <= 6000),
  rationale text not null default '',
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  requires_confirmation boolean not null default false,
  confirmed_by_user boolean not null default false,
  flags jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index suggestions_analysis on public.suggestions (analysis_id, position);
create index suggestions_pending on public.suggestions (user_id) where status = 'pending';

create table public.analysis_extras (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('cover_letter', 'interview_prep')),
  content jsonb not null,
  created_at timestamptz not null default now(),
  unique (analysis_id, kind)
);

create table public.exports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  resume_version_id uuid references public.resume_versions(id) on delete set null,
  format text not null check (format in ('pdf', 'docx')),
  template text not null,
  language text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Billing: plans (editable without code), customers, subscriptions, credits, usage
-- ---------------------------------------------------------------------------
create table public.plans (
  id text primary key,
  name text not null,
  kind text not null check (kind in ('free', 'pack', 'subscription')),
  price_cents integer not null default 0 check (price_cents >= 0),
  currency text not null default 'eur',
  billing_interval text check (billing_interval in ('month', 'year')),
  analyses_included integer not null check (analyses_included >= 0),
  features jsonb not null default '{}',
  stripe_price_id text,
  active boolean not null default true,
  sort integer not null default 0,
  updated_at timestamptz not null default now()
);

create table public.billing_customers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text not null unique,
  created_at timestamptz not null default now()
);

create table public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan_id text not null references public.plans(id),
  status text not null,
  stripe_subscription_id text unique,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.credit_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  delta integer not null,
  credit_type text not null check (credit_type in ('free', 'paid')),
  reason text not null check (reason in ('signup_free', 'pack_purchase', 'analysis', 'refund', 'admin_adjustment')),
  external_ref text unique,
  created_at timestamptz not null default now()
);
create index credit_ledger_user on public.credit_ledger (user_id);

create table public.usage_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('analysis', 'parse_cv', 'extract_requirements', 'cover_letter', 'interview_prep', 'export')),
  provider text,
  model text,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  analysis_id uuid,
  created_at timestamptz not null default now()
);
create index usage_events_user_kind on public.usage_events (user_id, kind, created_at desc);

create table public.stripe_events (
  id text primary key,
  type text not null,
  processed_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.profile_skills enable row level security;
alter table public.documents enable row level security;
alter table public.resumes enable row level security;
alter table public.resume_versions enable row level security;
alter table public.job_descriptions enable row level security;
alter table public.analyses enable row level security;
alter table public.suggestions enable row level security;
alter table public.analysis_extras enable row level security;
alter table public.exports enable row level security;
alter table public.plans enable row level security;
alter table public.billing_customers enable row level security;
alter table public.subscriptions enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.usage_events enable row level security;
alter table public.stripe_events enable row level security;

create policy profiles_select on public.profiles for select to authenticated using (id = auth.uid());
create policy profiles_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy skills_all on public.profile_skills for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy documents_select on public.documents for select to authenticated using (user_id = auth.uid());
create policy documents_update on public.documents for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy documents_delete on public.documents for delete to authenticated using (user_id = auth.uid());
-- documents are inserted by the server after validation (service role).

create policy resumes_all on public.resumes for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and (source_document_id is null or exists (select 1 from public.documents d where d.id = source_document_id and d.user_id = auth.uid()))
  );

-- Versions are immutable: no UPDATE policy.
create policy versions_select on public.resume_versions for select to authenticated using (user_id = auth.uid());
create policy versions_insert on public.resume_versions for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.resumes r where r.id = resume_id and r.user_id = auth.uid()));
create policy versions_delete on public.resume_versions for delete to authenticated using (user_id = auth.uid());

create policy jobs_all on public.job_descriptions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Analyses are created only by the server after a credit is consumed; users can read and delete.
create policy analyses_select on public.analyses for select to authenticated using (user_id = auth.uid());
create policy analyses_delete on public.analyses for delete to authenticated using (user_id = auth.uid());

create policy suggestions_select on public.suggestions for select to authenticated using (user_id = auth.uid());
create policy suggestions_update on public.suggestions for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy extras_select on public.analysis_extras for select to authenticated using (user_id = auth.uid());
create policy extras_delete on public.analysis_extras for delete to authenticated using (user_id = auth.uid());

create policy exports_select on public.exports for select to authenticated using (user_id = auth.uid());

create policy plans_read on public.plans for select to anon, authenticated using (active);

create policy customers_select on public.billing_customers for select to authenticated using (user_id = auth.uid());
create policy subscriptions_select on public.subscriptions for select to authenticated using (user_id = auth.uid());
create policy ledger_select on public.credit_ledger for select to authenticated using (user_id = auth.uid());
create policy usage_select on public.usage_events for select to authenticated using (user_id = auth.uid());
-- stripe_events: no policies -> service role only.

-- Users may only change the editable columns of a suggestion.
revoke update on public.suggestions from authenticated;
grant update (status, edited_text, confirmed_by_user, updated_at) on public.suggestions to authenticated;
revoke update on public.documents from authenticated;
grant update (extracted_text, original_deleted_at, storage_path) on public.documents to authenticated;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger resumes_touch before update on public.resumes for each row execute function public.touch_updated_at();
create trigger jobs_touch before update on public.job_descriptions for each row execute function public.touch_updated_at();
create trigger suggestions_touch before update on public.suggestions for each row execute function public.touch_updated_at();

-- New user: profile + free credits defined by the 'free' plan.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  free_credits integer;
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(left(new.raw_user_meta_data ->> 'full_name', 200), ''))
  on conflict do nothing;
  select analyses_included into free_credits from public.plans where id = 'free' and active;
  if coalesce(free_credits, 0) > 0 then
    insert into public.credit_ledger (user_id, delta, credit_type, reason, external_ref)
    values (new.id, free_credits, 'free', 'signup_free', 'signup:' || new.id::text)
    on conflict (external_ref) do nothing;
  end if;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Credit consumption (server only). Serialised per user with an advisory lock,
-- so concurrent requests cannot spend the same credit twice.
-- Order: active subscription quota -> paid credits -> free credits.
-- ---------------------------------------------------------------------------
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
    where user_id = p_user and kind = 'analysis' and created_at >= coalesce(sub.current_period_start, now() - interval '1 month');
    if used < sub.analyses_included then
      insert into public.usage_events (user_id, kind) values (p_user, 'analysis') returning id into ev_id;
      return query select true, 'full'::text, 'subscription'::text, ev_id, null::bigint, sub.pfeatures;
      return;
    end if;
  end if;

  select coalesce(sum(delta), 0) into balance from public.credit_ledger where user_id = p_user and credit_type = 'paid';
  if balance > 0 then
    insert into public.credit_ledger (user_id, delta, credit_type, reason) values (p_user, -1, 'paid', 'analysis') returning id into led_id;
    insert into public.usage_events (user_id, kind) values (p_user, 'analysis') returning id into ev_id;
    select p.features into plan_features from public.plans p where p.kind = 'pack' order by p.sort limit 1;
    return query select true, 'full'::text, 'paid_credit'::text, ev_id, led_id, coalesce(plan_features, '{}'::jsonb);
    return;
  end if;

  select coalesce(sum(delta), 0) into balance from public.credit_ledger where user_id = p_user and credit_type = 'free';
  if balance > 0 then
    insert into public.credit_ledger (user_id, delta, credit_type, reason) values (p_user, -1, 'free', 'analysis') returning id into led_id;
    insert into public.usage_events (user_id, kind) values (p_user, 'analysis') returning id into ev_id;
    select p.features into plan_features from public.plans p where p.id = 'free';
    return query select true, 'free'::text, 'free_credit'::text, ev_id, led_id, coalesce(plan_features, '{}'::jsonb);
    return;
  end if;

  return query select false, null::text, 'no_credits'::text, null::bigint, null::bigint, '{}'::jsonb;
end $$;

-- Gives the credit back when an analysis fails after consumption.
create or replace function public.refund_analysis_credit(p_user uuid, p_usage_event_id bigint, p_ledger_id bigint)
returns void language plpgsql security definer set search_path = public as $$
declare
  ctype text;
begin
  if p_usage_event_id is not null then
    delete from public.usage_events where id = p_usage_event_id and user_id = p_user;
  end if;
  if p_ledger_id is not null then
    select credit_type into ctype from public.credit_ledger where id = p_ledger_id and user_id = p_user and reason = 'analysis';
    if found then
      insert into public.credit_ledger (user_id, delta, credit_type, reason, external_ref)
      values (p_user, 1, ctype, 'refund', 'refund:' || p_ledger_id::text)
      on conflict (external_ref) do nothing;
    end if;
  end if;
end $$;

-- Read-only summary for the UI (callable by the user for themselves only).
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
       and s.current_period_start is not null and u.created_at >= s.current_period_start),
    p.analyses_included
  from (select 1) one
  left join public.subscriptions s on s.user_id = auth.uid()
  left join public.plans p on p.id = s.plan_id;
$$;

revoke all on function public.consume_analysis_credit(uuid) from public, anon, authenticated;
revoke all on function public.refund_analysis_credit(uuid, bigint, bigint) from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.consume_analysis_credit(uuid) to service_role;
grant execute on function public.refund_analysis_credit(uuid, bigint, bigint) to service_role;
grant execute on function public.credit_summary() to authenticated;

-- ---------------------------------------------------------------------------
-- Seed plans (hypothetical prices — edit rows in the dashboard, no code change needed)
-- ---------------------------------------------------------------------------
insert into public.plans (id, name, kind, price_cents, currency, billing_interval, analyses_included, features, sort) values
  ('free', 'Free', 'free', 0, 'eur', null, 1,
   '{"max_suggestions": 5, "cover_letter": false, "interview_prep": false, "export_docx": true, "export_pdf": true}', 0),
  ('pack_5', 'Analysis pack', 'pack', 700, 'eur', null, 5,
   '{"max_suggestions": null, "cover_letter": true, "interview_prep": true, "export_docx": true, "export_pdf": true}', 1),
  ('pro_monthly', 'Pro', 'subscription', 1200, 'eur', 'month', 40,
   '{"max_suggestions": null, "cover_letter": true, "interview_prep": true, "export_docx": true, "export_pdf": true}', 2)
on conflict (id) do nothing;
