-- CV Match — Supabase database advisor fixes (no behaviour change).
--
-- 1. function_search_path_mutable: touch_updated_at ran with the caller's search_path.
--    It only calls now() (pg_catalog), so an empty search_path is safe.
-- 2. auth_rls_initplan: policies calling auth.uid() directly re-evaluate it for every row.
--    Wrapping it in a scalar subquery, (select auth.uid()), lets Postgres evaluate it once per
--    statement. Each policy is dropped and recreated with the same command, roles and logic.
--
-- Idempotent: safe to run more than once.

alter function public.touch_updated_at() set search_path = '';

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using (id = (select auth.uid()));
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists skills_all on public.profile_skills;
create policy skills_all on public.profile_skills for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists documents_select on public.documents;
create policy documents_select on public.documents for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists documents_update on public.documents;
create policy documents_update on public.documents for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists documents_delete on public.documents;
create policy documents_delete on public.documents for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists resumes_all on public.resumes;
create policy resumes_all on public.resumes for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (source_document_id is null or exists (select 1 from public.documents d where d.id = source_document_id and d.user_id = (select auth.uid())))
  );

drop policy if exists versions_select on public.resume_versions;
create policy versions_select on public.resume_versions for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists versions_insert on public.resume_versions;
create policy versions_insert on public.resume_versions for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.resumes r where r.id = resume_id and r.user_id = (select auth.uid()))
    and (analysis_id is null or exists (select 1 from public.analyses a where a.id = analysis_id and a.user_id = (select auth.uid())))
  );
drop policy if exists versions_delete on public.resume_versions;
create policy versions_delete on public.resume_versions for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists jobs_all on public.job_descriptions;
create policy jobs_all on public.job_descriptions for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists analyses_select on public.analyses;
create policy analyses_select on public.analyses for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists analyses_delete on public.analyses;
create policy analyses_delete on public.analyses for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists suggestions_select on public.suggestions;
create policy suggestions_select on public.suggestions for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists suggestions_update on public.suggestions;
create policy suggestions_update on public.suggestions for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists extras_select on public.analysis_extras;
create policy extras_select on public.analysis_extras for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists extras_delete on public.analysis_extras;
create policy extras_delete on public.analysis_extras for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists exports_select on public.exports;
create policy exports_select on public.exports for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists customers_select on public.billing_customers;
create policy customers_select on public.billing_customers for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists subscriptions_select on public.subscriptions;
create policy subscriptions_select on public.subscriptions for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists ledger_select on public.credit_ledger;
create policy ledger_select on public.credit_ledger for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists usage_select on public.usage_events;
create policy usage_select on public.usage_events for select to authenticated using (user_id = (select auth.uid()));

-- Storage policies (migration 20261028000002). Guarded so the migration also applies where the
-- storage schema does not exist (the PGlite test database).
do $$
begin
  if to_regclass('storage.objects') is not null then
    drop policy if exists "cv originals: owner read" on storage.objects;
    create policy "cv originals: owner read" on storage.objects for select to authenticated
      using (bucket_id = 'cv-originals' and (storage.foldername(name))[1] = (select auth.uid())::text);
    drop policy if exists "cv originals: owner delete" on storage.objects;
    create policy "cv originals: owner delete" on storage.objects for delete to authenticated
      using (bucket_id = 'cv-originals' and (storage.foldername(name))[1] = (select auth.uid())::text);
  end if;
end $$;
