-- CV Match — feedback balloon: suggestions and problem reports about the product itself.
-- Unrelated to public.suggestions, which holds CV improvement suggestions.
--
-- Server-only table: RLS is on with no policies (like stripe_events) and client roles hold no privileges,
-- so every read and write goes through the service role. Rows follow the account (on delete cascade), as
-- every other per-user table does.

create table public.product_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('suggestion', 'problem')),
  message text not null check (char_length(message) between 1 and 4000),
  page text not null default '' check (char_length(page) <= 500),
  status text not null default 'new' check (status in ('new', 'reviewing', 'resolved')),
  created_at timestamptz not null default now()
);

-- The per-user rate limit (and the foreign key) and the admin list, newest first.
create index product_feedback_user_created_idx on public.product_feedback (user_id, created_at desc);
create index product_feedback_created_idx on public.product_feedback (created_at desc);

alter table public.product_feedback enable row level security;

-- Tables in public get client privileges by default: remove them, and grant the server explicitly.
revoke all on public.product_feedback from public, anon, authenticated;
grant select, insert, update, delete on public.product_feedback to service_role;

-- Counts and inserts under one per-user lock, so parallel requests cannot all pass the limit
-- (same approach as reserve_usage).
create or replace function public.submit_product_feedback(
  p_user uuid,
  p_kind text,
  p_message text,
  p_page text,
  p_per_hour integer
) returns public.product_feedback
language plpgsql security definer set search_path = public as $$
declare
  n integer;
  saved public.product_feedback;
begin
  perform pg_advisory_xact_lock(hashtext('feedback:' || p_user::text));

  select count(*) into n from public.product_feedback
  where user_id = p_user and created_at >= now() - interval '1 hour';
  if n >= p_per_hour then raise exception 'rate_limited' using errcode = 'P0001'; end if;

  insert into public.product_feedback (user_id, kind, message, page)
  values (p_user, p_kind, p_message, p_page)
  returning * into saved;
  return saved;
end $$;

revoke all on function public.submit_product_feedback(uuid, text, text, text, integer) from public, anon, authenticated;
grant execute on function public.submit_product_feedback(uuid, text, text, text, integer) to service_role;
