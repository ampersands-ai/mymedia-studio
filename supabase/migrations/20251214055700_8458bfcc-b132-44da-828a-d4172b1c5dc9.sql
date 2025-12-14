-- Update the status check constraint to include 'rendering'
ALTER TABLE public.storyboards DROP CONSTRAINT IF EXISTS check_storyboard_status;

ALTER TABLE public.storyboards ADD CONSTRAINT check_storyboard_status 
CHECK (status = ANY (ARRAY['draft'::text, 'generating'::text, 'rendering'::text, 'completed'::text, 'complete'::text, 'failed'::text]));