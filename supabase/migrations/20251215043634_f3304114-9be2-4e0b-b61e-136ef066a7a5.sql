-- Drop the old style constraint
ALTER TABLE video_jobs DROP CONSTRAINT video_jobs_style_check;

-- Add updated constraint with all story tone options
ALTER TABLE video_jobs ADD CONSTRAINT video_jobs_style_check CHECK (
  style = ANY (ARRAY[
    'educational'::text, 
    'storytelling'::text, 
    'dramatic'::text, 
    'documentary'::text, 
    'horror'::text, 
    'tech'::text, 
    'fantasy'::text, 
    'comedy'::text, 
    'inspirational'::text, 
    'investigative'::text, 
    'emotional'::text,
    -- Keep legacy styles for backwards compatibility with existing jobs
    'modern'::text,
    'cinematic'::text, 
    'minimalist'::text,
    'vintage'::text,
    'cyberpunk'::text,
    'noir'::text,
    'anime'::text,
    'watercolor'::text,
    'pop-art'::text,
    'surreal'::text
  ])
);