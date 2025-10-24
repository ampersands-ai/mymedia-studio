-- Add awaiting_approval status to video_jobs table
ALTER TABLE video_jobs 
DROP CONSTRAINT IF EXISTS video_jobs_status_check;

ALTER TABLE video_jobs 
ADD CONSTRAINT video_jobs_status_check 
CHECK (status IN ('pending', 'generating_script', 'generating_voice', 'awaiting_approval', 'fetching_video', 'assembling', 'completed', 'failed'));