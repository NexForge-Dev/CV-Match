-- Private bucket for original uploads (only used when STORE_ORIGINAL_FILES=true).
-- Files live under "<user_id>/<uuid>.<ext>"; users can only touch their own folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cv-originals', 'cv-originals', false, 10485760,
  array['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
on conflict (id) do nothing;

create policy "cv originals: owner read" on storage.objects for select to authenticated
  using (bucket_id = 'cv-originals' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "cv originals: owner delete" on storage.objects for delete to authenticated
  using (bucket_id = 'cv-originals' and (storage.foldername(name))[1] = auth.uid()::text);
-- Uploads are performed by the server (service role) after validation.
