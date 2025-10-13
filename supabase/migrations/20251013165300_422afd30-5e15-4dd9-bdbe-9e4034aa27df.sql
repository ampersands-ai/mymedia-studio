-- Add AI caption and hashtags columns to generations table
ALTER TABLE public.generations
ADD COLUMN ai_caption TEXT,
ADD COLUMN ai_hashtags TEXT[],
ADD COLUMN caption_generated_at TIMESTAMP WITH TIME ZONE;