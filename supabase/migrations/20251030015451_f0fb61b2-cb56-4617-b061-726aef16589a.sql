-- Add media type and video search columns to storyboards table
ALTER TABLE public.storyboards 
ADD COLUMN media_type TEXT DEFAULT 'image' CHECK (media_type IN ('image', 'video', 'animated')),
ADD COLUMN video_search_query TEXT;

-- Add video_url column to storyboard_scenes for video mode
ALTER TABLE public.storyboard_scenes
ADD COLUMN video_url TEXT,
ADD COLUMN motion_effect JSONB DEFAULT NULL;