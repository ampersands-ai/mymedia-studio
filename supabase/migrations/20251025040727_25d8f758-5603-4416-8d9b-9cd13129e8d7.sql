-- Add caption and hashtag columns to video_jobs table
ALTER TABLE video_jobs 
ADD COLUMN IF NOT EXISTS ai_caption TEXT,
ADD COLUMN IF NOT EXISTS ai_hashtags TEXT[],
ADD COLUMN IF NOT EXISTS caption_generated_at TIMESTAMPTZ;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_video_jobs_caption_generated ON video_jobs(caption_generated_at) WHERE caption_generated_at IS NOT NULL;