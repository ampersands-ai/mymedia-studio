-- Add column to store locked model TypeScript implementation
ALTER TABLE public.ai_models
ADD COLUMN locked_file_contents text;

COMMENT ON COLUMN public.ai_models.locked_file_contents IS 'Complete TypeScript implementation snapshot for locked models';