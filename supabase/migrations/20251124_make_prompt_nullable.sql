-- Migration: Make prompt column nullable to support registry-based architecture
--
-- RATIONALE:
-- The generations table currently has `prompt TEXT NOT NULL` which violates
-- the registry-based architecture where each model defines its own schema.
--
-- Models like Remove Background, Upscale, etc. don't have prompt fields.
-- All inputs should be stored in the `settings` JSONB column, with prompt
-- as an optional column for legacy/convenience.

-- Make prompt nullable
ALTER TABLE public.generations
ALTER COLUMN prompt DROP NOT NULL;

-- Update existing records with no prompt to NULL instead of empty string
UPDATE public.generations
SET prompt = NULL
WHERE prompt = '' OR prompt IS NULL;

-- Add comment to document the change
COMMENT ON COLUMN public.generations.prompt IS
  'Optional prompt field for text-based models. Not all models use prompts.
   All inputs are stored in settings JSONB column (registry-based architecture).';
