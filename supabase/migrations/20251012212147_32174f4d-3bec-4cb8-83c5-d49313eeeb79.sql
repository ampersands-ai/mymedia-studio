-- Add columns to support multi-output generations
ALTER TABLE public.generations 
ADD COLUMN IF NOT EXISTS parent_generation_id UUID REFERENCES public.generations(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS output_index INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_batch_output BOOLEAN DEFAULT false;

-- Create index for faster queries of child generations
CREATE INDEX IF NOT EXISTS idx_generations_parent_id ON public.generations(parent_generation_id);

-- Add comment for documentation
COMMENT ON COLUMN public.generations.parent_generation_id IS 'Links child outputs to their parent generation for multi-output requests';
COMMENT ON COLUMN public.generations.output_index IS 'Index of this output in a batch (0 for parent or single output)';
COMMENT ON COLUMN public.generations.is_batch_output IS 'True if this is a child output from a multi-output generation';