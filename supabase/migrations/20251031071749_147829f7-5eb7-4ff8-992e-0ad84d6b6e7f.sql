-- Add original_character_count to storyboards table for pricing calculations
ALTER TABLE public.storyboards
ADD COLUMN IF NOT EXISTS original_character_count integer;