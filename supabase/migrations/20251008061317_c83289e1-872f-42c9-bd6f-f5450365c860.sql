-- Add max_images column to ai_models table
ALTER TABLE public.ai_models
ADD COLUMN max_images integer;

COMMENT ON COLUMN public.ai_models.max_images IS 'Maximum number of images users can upload for this model. NULL means unlimited.';