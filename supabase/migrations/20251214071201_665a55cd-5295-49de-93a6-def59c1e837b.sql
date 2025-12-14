-- Update generated-content bucket to allow larger file sizes (500MB for long videos)
UPDATE storage.buckets 
SET file_size_limit = 524288000  -- 500MB in bytes
WHERE id = 'generated-content';