-- Drop the old constraint and add new one with all styles
ALTER TABLE public.video_jobs DROP CONSTRAINT video_jobs_style_check;

ALTER TABLE public.video_jobs ADD CONSTRAINT video_jobs_style_check 
CHECK (style = ANY (ARRAY[
  'modern', 
  'cinematic', 
  'minimalist', 
  'tech', 
  'educational', 
  'dramatic',
  'documentary',
  'storytelling',
  'horror',
  'vintage',
  'cyberpunk',
  'fantasy',
  'noir',
  'anime',
  'watercolor',
  'pop-art',
  'minimalist',
  'surreal'
]));