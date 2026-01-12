-- Remove the default value so new storyboards start with NULL render_mode
ALTER TABLE public.storyboards 
ALTER COLUMN render_mode DROP DEFAULT;

-- Reset recently created storyboards to NULL for testing the mode selector
UPDATE public.storyboards 
SET render_mode = NULL 
WHERE created_at > NOW() - INTERVAL '1 day';