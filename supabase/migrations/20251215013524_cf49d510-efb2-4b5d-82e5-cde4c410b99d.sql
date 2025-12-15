-- Add voiceover_tier column to video_jobs
ALTER TABLE public.video_jobs 
ADD COLUMN IF NOT EXISTS voiceover_tier TEXT NOT NULL DEFAULT 'standard';

-- Add constraint for valid tier values
ALTER TABLE public.video_jobs 
ADD CONSTRAINT video_jobs_voiceover_tier_check 
CHECK (voiceover_tier IN ('standard', 'pro'));

-- Add column for tracking voiceover regeneration count
ALTER TABLE public.video_jobs 
ADD COLUMN IF NOT EXISTS voiceover_regeneration_count INTEGER NOT NULL DEFAULT 0;