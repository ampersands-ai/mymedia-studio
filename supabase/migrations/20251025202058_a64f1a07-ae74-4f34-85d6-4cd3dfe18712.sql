-- Step 1: Make the generated-content bucket public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'generated-content';

-- Step 2: Add storage_path column to video_jobs table
ALTER TABLE video_jobs 
ADD COLUMN storage_path TEXT;

-- Update existing records to have the correct storage path
UPDATE video_jobs 
SET storage_path = user_id || '/' || 
                   TO_CHAR(created_at, 'YYYY-MM-DD') || '/' || 
                   id || '.mp4'
WHERE status = 'completed' 
  AND final_video_url IS NOT NULL
  AND storage_path IS NULL;