-- Add second image prompt column for dual-image generation (~4.5s per image)
ALTER TABLE storyboard_scenes 
ADD COLUMN IF NOT EXISTS image_prompt_2 text;