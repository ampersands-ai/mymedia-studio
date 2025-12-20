-- Add notify_on_completion to video_jobs table
ALTER TABLE public.video_jobs 
ADD COLUMN IF NOT EXISTS notify_on_completion boolean DEFAULT true;

-- Add notify_on_completion to storyboards table
ALTER TABLE public.storyboards 
ADD COLUMN IF NOT EXISTS notify_on_completion boolean DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN public.video_jobs.notify_on_completion IS 'Whether to send email notification when video generation is complete';
COMMENT ON COLUMN public.storyboards.notify_on_completion IS 'Whether to send email notification when storyboard video render is complete';