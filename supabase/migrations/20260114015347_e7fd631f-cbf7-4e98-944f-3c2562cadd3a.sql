-- Add render tracking columns to blackboard_storyboards
ALTER TABLE blackboard_storyboards 
ADD COLUMN IF NOT EXISTS render_job_id TEXT,
ADD COLUMN IF NOT EXISTS estimated_render_cost NUMERIC DEFAULT 0;

-- Add index for webhook lookups
CREATE INDEX IF NOT EXISTS idx_blackboard_storyboards_render_job_id 
ON blackboard_storyboards(render_job_id) 
WHERE render_job_id IS NOT NULL;