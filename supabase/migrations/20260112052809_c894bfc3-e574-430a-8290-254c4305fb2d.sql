-- Add second intro image prompt column to storyboards
ALTER TABLE public.storyboards ADD COLUMN IF NOT EXISTS intro_image_prompt_2 TEXT;