-- Add locking columns to ai_models table for lock-based architecture
ALTER TABLE public.ai_models 
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS locked_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS locked_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS locked_file_path TEXT;

-- Create index for performance when filtering locked models
CREATE INDEX IF NOT EXISTS idx_ai_models_locked ON public.ai_models(is_locked) WHERE is_locked = true;

-- Add comment explaining the locking system
COMMENT ON COLUMN public.ai_models.is_locked IS 'When true, this model uses a dedicated generated TypeScript file instead of dynamic execution';
COMMENT ON COLUMN public.ai_models.locked_file_path IS 'Relative path to the generated TypeScript file (e.g., "GoogleVeo31HQ.ts")';