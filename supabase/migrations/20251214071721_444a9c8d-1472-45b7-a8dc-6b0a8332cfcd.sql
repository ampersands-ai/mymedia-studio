-- Update the duration check constraint to allow up to 1080 seconds (18 minutes)
ALTER TABLE public.video_jobs DROP CONSTRAINT IF EXISTS video_jobs_duration_check;

ALTER TABLE public.video_jobs ADD CONSTRAINT video_jobs_duration_check 
  CHECK ((duration >= 15) AND (duration <= 1080));