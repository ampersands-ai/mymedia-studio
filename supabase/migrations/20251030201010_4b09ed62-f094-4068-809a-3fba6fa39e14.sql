-- Add comprehensive customization columns to storyboards table
ALTER TABLE storyboards ADD COLUMN IF NOT EXISTS aspect_ratio TEXT DEFAULT 'instagram-story';
ALTER TABLE storyboards ADD COLUMN IF NOT EXISTS video_quality TEXT DEFAULT 'medium';
ALTER TABLE storyboards ADD COLUMN IF NOT EXISTS fps INTEGER DEFAULT 25;
ALTER TABLE storyboards ADD COLUMN IF NOT EXISTS subtitle_settings JSONB DEFAULT '{"position": "mid-bottom-center", "fontSize": 140, "outlineColor": "#000000", "outlineWidth": 8}'::jsonb;
ALTER TABLE storyboards ADD COLUMN IF NOT EXISTS music_settings JSONB DEFAULT '{"volume": 0.05, "fadeIn": 2, "fadeOut": 2, "duration": -2}'::jsonb;
ALTER TABLE storyboards ADD COLUMN IF NOT EXISTS image_animation_settings JSONB DEFAULT '{"zoom": 2, "position": "center-center"}'::jsonb;
ALTER TABLE storyboards ADD COLUMN IF NOT EXISTS enable_cache BOOLEAN DEFAULT true;
ALTER TABLE storyboards ADD COLUMN IF NOT EXISTS draft_mode BOOLEAN DEFAULT false;