-- Drop the old duration check constraint
ALTER TABLE video_jobs DROP CONSTRAINT IF EXISTS video_jobs_duration_check;

-- Add the new duration check constraint with updated range
ALTER TABLE video_jobs ADD CONSTRAINT video_jobs_duration_check CHECK (duration >= 10 AND duration <= 180);