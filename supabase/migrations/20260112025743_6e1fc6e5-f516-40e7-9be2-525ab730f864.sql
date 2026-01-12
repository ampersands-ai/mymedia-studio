-- Allow video storyboards to store a video search query and omit image prompts when not applicable

ALTER TABLE public.storyboard_scenes
ADD COLUMN IF NOT EXISTS video_search_query text;

-- image_prompt is only required for image/animated modes; allow NULL for video mode
ALTER TABLE public.storyboard_scenes
ALTER COLUMN image_prompt DROP NOT NULL;