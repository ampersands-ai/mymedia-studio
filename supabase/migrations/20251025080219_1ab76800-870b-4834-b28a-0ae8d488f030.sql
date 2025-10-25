-- Increase video-assets bucket file size limit to 200MB
UPDATE storage.buckets
SET file_size_limit = 209715200  -- 200MB in bytes (200 * 1024 * 1024)
WHERE name = 'video-assets';