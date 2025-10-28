-- Make generated-content bucket public to enable image transformation API
-- This is safe because RLS policies control access to the content
UPDATE storage.buckets 
SET public = true 
WHERE id = 'generated-content';