-- Storage policies for generated-content bucket to allow client uploads and public reads

-- Allow public read access to generated-content bucket
create policy "Public read access for generated content"
  on storage.objects
  for select
  using (bucket_id = 'generated-content');

-- Allow authenticated users to upload into their own folder
create policy "Users can upload own generated content"
  on storage.objects
  for insert
  with check (
    bucket_id = 'generated-content'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow authenticated users to update their own objects
create policy "Users can update own generated content"
  on storage.objects
  for update
  using (
    bucket_id = 'generated-content'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow authenticated users to delete their own objects
create policy "Users can delete own generated content"
  on storage.objects
  for delete
  using (
    bucket_id = 'generated-content'
    and auth.uid()::text = (storage.foldername(name))[1]
  );