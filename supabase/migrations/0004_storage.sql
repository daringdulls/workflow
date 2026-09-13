-- ============================================================================
-- Pixel Core — Storage bucket for guest/booking/quotation/agent documents.
-- Files are stored at: <organization_id>/<related_type>/<related_id>/<filename>
-- so storage policies can scope access by organization the same way table RLS does.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('pixel-files', 'pixel-files', false)
on conflict (id) do nothing;

create policy "org members read own files"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'pixel-files'
    and (storage.foldername(name))[1] = current_profile_org()::text
  );

create policy "org members upload own files"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'pixel-files'
    and (storage.foldername(name))[1] = current_profile_org()::text
  );

create policy "org members delete own files"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'pixel-files'
    and (storage.foldername(name))[1] = current_profile_org()::text
  );
