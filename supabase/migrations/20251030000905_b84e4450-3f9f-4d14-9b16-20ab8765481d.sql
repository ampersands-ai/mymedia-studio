-- Drop the old duration constraint
ALTER TABLE public.storyboards 
DROP CONSTRAINT IF EXISTS storyboards_duration_check;

-- Add new duration constraint for 15-120 seconds in 5-second increments
ALTER TABLE public.storyboards 
ADD CONSTRAINT storyboards_duration_check 
CHECK (duration >= 15 AND duration <= 120 AND duration % 5 = 0);