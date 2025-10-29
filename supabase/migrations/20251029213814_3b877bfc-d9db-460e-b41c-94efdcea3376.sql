-- Add customization fields to storyboards table for JSON2Video template variables
ALTER TABLE public.storyboards
ADD COLUMN IF NOT EXISTS voice_model TEXT DEFAULT 'azure' CHECK (voice_model IN ('azure', 'elevenlabs', 'google')),
ADD COLUMN IF NOT EXISTS image_model TEXT DEFAULT 'freepik-classic' CHECK (image_model IN ('freepik-classic', 'flux', 'dall-e-3')),
ADD COLUMN IF NOT EXISTS subtitles_model TEXT DEFAULT 'default',
ADD COLUMN IF NOT EXISTS font_family TEXT DEFAULT 'Oswald Bold',
ADD COLUMN IF NOT EXISTS background_music_url TEXT,
ADD COLUMN IF NOT EXISTS background_music_volume DECIMAL(3,2) DEFAULT 0.05 CHECK (background_music_volume >= 0 AND background_music_volume <= 1);

-- Add comment for documentation
COMMENT ON COLUMN public.storyboards.voice_model IS 'Voice synthesis provider: azure, elevenlabs, or google';
COMMENT ON COLUMN public.storyboards.image_model IS 'Image generation model: freepik-classic, flux, or dall-e-3';
COMMENT ON COLUMN public.storyboards.subtitles_model IS 'Subtitle styling model for JSON2Video';
COMMENT ON COLUMN public.storyboards.font_family IS 'Font family for subtitles and text overlays';
COMMENT ON COLUMN public.storyboards.background_music_url IS 'URL to background music file';
COMMENT ON COLUMN public.storyboards.background_music_volume IS 'Background music volume (0.0 to 1.0)';