-- Make generated-content bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'generated-content';

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Users can read own generated content" ON storage.objects;
DROP POLICY IF EXISTS "Users can insert own generated content" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own generated content" ON storage.objects;

-- Add storage policies for user-specific access
CREATE POLICY "Users can read own generated content"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'generated-content' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can insert own generated content"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'generated-content' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own generated content"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'generated-content' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);