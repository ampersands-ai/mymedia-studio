-- Add estimated_time_minutes to ai_models table
ALTER TABLE public.ai_models
ADD COLUMN estimated_time_minutes INTEGER;

COMMENT ON COLUMN public.ai_models.estimated_time_minutes IS 'Estimated time in minutes for generation to complete';

-- Add estimated_time_minutes to content_templates table
ALTER TABLE public.content_templates
ADD COLUMN estimated_time_minutes INTEGER;

COMMENT ON COLUMN public.content_templates.estimated_time_minutes IS 'Estimated time in minutes for generation to complete';