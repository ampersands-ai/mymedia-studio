-- Add new columns to video_jobs table for aspect ratio, caption styling, and custom backgrounds
ALTER TABLE video_jobs 
  ADD COLUMN IF NOT EXISTS aspect_ratio TEXT DEFAULT '4:5',
  ADD COLUMN IF NOT EXISTS caption_style JSONB DEFAULT '{"position":"center","animation":"zoom","fontSize":72,"fontWeight":"black","fontFamily":"Montserrat","textColor":"#FFFFFF","backgroundColor":"rgba(0,0,0,0)","strokeColor":"#000000","strokeWidth":3}'::jsonb,
  ADD COLUMN IF NOT EXISTS custom_background_video TEXT,
  ADD COLUMN IF NOT EXISTS background_video_thumbnail TEXT;

-- Add comment for documentation
COMMENT ON COLUMN video_jobs.aspect_ratio IS 'Video aspect ratio: 16:9, 9:16, 4:5, or 1:1';
COMMENT ON COLUMN video_jobs.caption_style IS 'JSON object containing caption styling preferences';
COMMENT ON COLUMN video_jobs.custom_background_video IS 'User-selected background video URL from Pexels';
COMMENT ON COLUMN video_jobs.background_video_thumbnail IS 'Thumbnail URL for the selected background video';