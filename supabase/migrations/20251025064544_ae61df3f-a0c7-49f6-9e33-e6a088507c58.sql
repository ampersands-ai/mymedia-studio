-- Add background_media_type column to video_jobs table to support both video and image backgrounds
ALTER TABLE video_jobs 
ADD COLUMN background_media_type TEXT DEFAULT 'video' CHECK (background_media_type IN ('video', 'image'));