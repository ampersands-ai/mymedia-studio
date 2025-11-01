-- Fix the model ID typo (remove trailing quote)
UPDATE ai_models 
SET id = 'runware:100@1' 
WHERE id = 'runware:100@1"';

-- Update any existing generations that reference the old ID
UPDATE generations 
SET model_id = 'runware:100@1' 
WHERE model_id = 'runware:100@1"';

-- Enable realtime for generations table (needed for async polling)
ALTER PUBLICATION supabase_realtime ADD TABLE public.generations;