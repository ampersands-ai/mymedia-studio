-- Add intro_video_url column to storyboards table for animated intro scenes
ALTER TABLE storyboards ADD COLUMN IF NOT EXISTS intro_video_url TEXT;