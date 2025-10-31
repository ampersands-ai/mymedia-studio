-- Add comprehensive subtitle settings columns to storyboards table
ALTER TABLE storyboards
ADD COLUMN IF NOT EXISTS subtitle_language text DEFAULT 'auto',
ADD COLUMN IF NOT EXISTS subtitle_model text DEFAULT 'default',
ADD COLUMN IF NOT EXISTS subtitle_style text DEFAULT 'boxed-word',
ADD COLUMN IF NOT EXISTS subtitle_font_family text DEFAULT 'Oswald Bold',
ADD COLUMN IF NOT EXISTS subtitle_all_caps boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS subtitle_box_color text DEFAULT '#000000',
ADD COLUMN IF NOT EXISTS subtitle_line_color text DEFAULT '#FFFFFF',
ADD COLUMN IF NOT EXISTS subtitle_word_color text DEFAULT '#FFFF00',
ADD COLUMN IF NOT EXISTS subtitle_shadow_color text DEFAULT '#000000',
ADD COLUMN IF NOT EXISTS subtitle_shadow_offset integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS subtitle_max_words_per_line integer DEFAULT 4;

-- Add comment for documentation
COMMENT ON COLUMN storyboards.subtitle_language IS 'Language for transcription (auto, en, es, fr, etc.)';
COMMENT ON COLUMN storyboards.subtitle_model IS 'Transcription model (default or whisper)';
COMMENT ON COLUMN storyboards.subtitle_style IS 'Subtitle display style (classic, boxed-word, etc.)';
COMMENT ON COLUMN storyboards.subtitle_font_family IS 'Font family name for subtitles';
COMMENT ON COLUMN storyboards.subtitle_all_caps IS 'Whether to display subtitles in uppercase';
COMMENT ON COLUMN storyboards.subtitle_box_color IS 'Background color for subtitle box';
COMMENT ON COLUMN storyboards.subtitle_line_color IS 'Color for non-current words';
COMMENT ON COLUMN storyboards.subtitle_word_color IS 'Color for currently spoken word';
COMMENT ON COLUMN storyboards.subtitle_shadow_color IS 'Shadow color for subtitles';
COMMENT ON COLUMN storyboards.subtitle_shadow_offset IS 'Shadow offset in pixels';
COMMENT ON COLUMN storyboards.subtitle_max_words_per_line IS 'Maximum words per subtitle line';