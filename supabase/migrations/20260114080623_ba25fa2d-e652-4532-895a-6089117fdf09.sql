-- Add render options columns to blackboard_storyboards
ALTER TABLE public.blackboard_storyboards
ADD COLUMN IF NOT EXISTS background_audio_url TEXT,
ADD COLUMN IF NOT EXISTS background_audio_volume NUMERIC DEFAULT 0.5,
ADD COLUMN IF NOT EXISTS background_audio_fade_in BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS background_audio_fade_out BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS outro_media_url TEXT,
ADD COLUMN IF NOT EXISTS outro_media_type TEXT,
ADD COLUMN IF NOT EXISTS outro_duration NUMERIC DEFAULT 3;