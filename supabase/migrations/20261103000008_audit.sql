-- CV Match — audit 2026-11-02: integrity limits on user-writable columns and document deletion.
--
-- Users can write some tables directly through the Data API (RLS restricts them to their own rows).
-- The app validates every value it writes, but direct writes skipped those checks, so a user could
-- store values the pages cannot render (non-array requirements, javascript: links) or very large
-- payloads. The constraints below mirror the app's own limits. They are NOT VALID: existing rows are
-- not re-checked (nothing is rejected or deleted), every new or updated row is.
--
-- Idempotent: safe to run more than once.

-- 1. Job ads: the link must be http(s) (it is rendered as <a href>), requirements must be a bounded array.
alter table public.job_descriptions drop constraint if exists job_descriptions_url_http;
alter table public.job_descriptions add constraint job_descriptions_url_http
  check (url = '' or url ~* '^https?://') not valid;

alter table public.job_descriptions drop constraint if exists job_descriptions_requirements_array;
alter table public.job_descriptions add constraint job_descriptions_requirements_array
  check (jsonb_typeof(requirements) = 'array' and jsonb_array_length(requirements) <= 100) not valid;

-- 2. CV versions: an object of bounded size (a real CV is a few KB; the schema's theoretical maximum
--    is far below 2 MB of JSON text in practice).
alter table public.resume_versions drop constraint if exists resume_versions_data_object;
alter table public.resume_versions add constraint resume_versions_data_object
  check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 2000000) not valid;

-- 3. Profile: same bounds as the profile form (20 target locations of up to 100 characters).
alter table public.profiles drop constraint if exists profiles_target_locations_bounded;
alter table public.profiles add constraint profiles_target_locations_bounded
  check (cardinality(target_locations) <= 20 and octet_length(array_to_string(target_locations, '')) <= 4000) not valid;

-- 4. Documents are deleted only by the server: it removes the stored original file first. A direct
--    DELETE through the Data API would orphan that file in Storage (personal data the retention job
--    could no longer find).
drop policy if exists documents_delete on public.documents;
revoke delete on public.documents from authenticated;
