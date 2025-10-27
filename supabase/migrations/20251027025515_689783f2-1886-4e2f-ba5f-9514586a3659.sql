-- Security improvements: Storage bucket privacy and policies

-- 1. Make storage buckets private for better security
UPDATE storage.buckets
SET public = false
WHERE id IN ('generated-content', 'voice-previews');

-- 2. Update storage policies to allow only authenticated owner access
-- First drop existing policies
DROP POLICY IF EXISTS "Users can upload their own generations" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view generated content" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own generations" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own generations" ON storage.objects;
DROP POLICY IF EXISTS "Voice previews are publicly accessible" ON storage.objects;

-- Create new policies for generated-content bucket (private with RLS)
CREATE POLICY "Users can insert their own content"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'generated-content' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can read their own content"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'generated-content' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own content"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'generated-content' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own content"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'generated-content' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Voice previews bucket policies (allow service role for sync)
CREATE POLICY "Service role can manage voice previews"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'voice-previews');

CREATE POLICY "Authenticated users can read voice previews"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'voice-previews');