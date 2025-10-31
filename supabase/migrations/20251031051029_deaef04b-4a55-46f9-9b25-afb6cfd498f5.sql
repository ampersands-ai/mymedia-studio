-- Add intro_image_preview_url column to storyboards table
ALTER TABLE public.storyboards 
ADD COLUMN intro_image_preview_url TEXT;