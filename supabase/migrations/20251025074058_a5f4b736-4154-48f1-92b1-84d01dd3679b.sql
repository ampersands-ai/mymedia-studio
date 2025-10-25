-- Update video-assets bucket to allow video file uploads
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'video/mp4', 'video/webm', 'video/quicktime']
WHERE name = 'video-assets';