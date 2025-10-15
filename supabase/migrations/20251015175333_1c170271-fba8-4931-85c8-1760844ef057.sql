-- Rename columns from estimated_time_minutes to estimated_time_seconds
ALTER TABLE public.ai_models 
  RENAME COLUMN estimated_time_minutes TO estimated_time_seconds;

ALTER TABLE public.content_templates 
  RENAME COLUMN estimated_time_minutes TO estimated_time_seconds;

-- Convert existing minute values to seconds (multiply by 60)
UPDATE public.ai_models 
  SET estimated_time_seconds = estimated_time_seconds * 60 
  WHERE estimated_time_seconds IS NOT NULL;

UPDATE public.content_templates 
  SET estimated_time_seconds = estimated_time_seconds * 60 
  WHERE estimated_time_seconds IS NOT NULL;

-- Add comments for clarity
COMMENT ON COLUMN public.ai_models.estimated_time_seconds IS 'Estimated generation time in seconds';
COMMENT ON COLUMN public.content_templates.estimated_time_seconds IS 'Estimated generation time in seconds';