-- Clean up broken video jobs with unplayable voiceovers
DELETE FROM video_jobs 
WHERE id IN (
  'e01a0d03-ee7f-4377-bd76-82db65f0f7bd',
  'c40fcffd-5052-4003-bd72-a324fc227514'
);

-- Update video_jobs status constraint to include new approval statuses
ALTER TABLE video_jobs 
DROP CONSTRAINT IF EXISTS video_jobs_status_check;

ALTER TABLE video_jobs 
ADD CONSTRAINT video_jobs_status_check 
CHECK (status IN (
  'pending',
  'generating_script',
  'awaiting_script_approval',
  'generating_voice',
  'awaiting_voice_approval',
  'fetching_video',
  'assembling',
  'completed',
  'failed'
));