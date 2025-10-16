-- Fix storage policies for generated-content bucket
-- Remove old policies and create proper RLS policies

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own files" ON storage.objects;
DROP POLICY IF EXISTS "Service role full access" ON storage.objects;

-- Create proper RLS policies for generated-content bucket
CREATE POLICY "Authenticated users can view own files in generated-content"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'generated-content' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Authenticated users can upload to own folder in generated-content"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'generated-content' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Authenticated users can update own files in generated-content"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'generated-content' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Authenticated users can delete own files in generated-content"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'generated-content' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);