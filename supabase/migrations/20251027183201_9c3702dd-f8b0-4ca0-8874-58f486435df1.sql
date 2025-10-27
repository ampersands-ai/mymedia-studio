-- Make storage buckets private for better security
UPDATE storage.buckets
SET public = false
WHERE id IN ('generated-content', 'voice-previews');

-- Add RLS policy for owner-only access to generated content
CREATE POLICY "Users access own generated files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'generated-content' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Add RLS policy for owner-only access to voice previews
CREATE POLICY "Users access own voice previews"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'voice-previews' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to upload to their own folders
CREATE POLICY "Users upload own generated files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'generated-content' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users upload own voice previews"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'voice-previews' AND
  (storage.foldername(name))[1] = auth.uid()::text
);