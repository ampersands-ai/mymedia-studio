-- Add voice_name column to video_jobs table
ALTER TABLE video_jobs ADD COLUMN IF NOT EXISTS voice_name TEXT DEFAULT 'Rachel';

-- Update existing rows to have the default voice name
UPDATE video_jobs SET voice_name = 'Rachel' WHERE voice_name IS NULL;