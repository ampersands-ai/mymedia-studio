-- Phase 2: Add CHECK constraints to core tables
-- Phase 3: RLS policies skipped for views (they inherit from base tables)

-- Drop existing CHECK constraints that might conflict
ALTER TABLE storyboards DROP CONSTRAINT IF EXISTS storyboards_status_check;
ALTER TABLE generations DROP CONSTRAINT IF EXISTS generations_status_check;
ALTER TABLE video_jobs DROP CONSTRAINT IF EXISTS video_jobs_status_check;
ALTER TABLE workflow_executions DROP CONSTRAINT IF EXISTS workflow_executions_status_check;

-- Update existing data to match standard values
UPDATE storyboards SET status = 'completed' WHERE status IN ('complete', 'rendering');
UPDATE generations SET status = 'pending' WHERE status NOT IN ('pending', 'processing', 'completed', 'failed', 'cancelled');
UPDATE workflow_executions SET status = 'running' WHERE status = 'processing';

-- Add CHECK constraints to core tables

-- generations table
ALTER TABLE generations
ADD CONSTRAINT check_generation_status
CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled'));

-- video_jobs table
ALTER TABLE video_jobs
ADD CONSTRAINT check_video_job_status
CHECK (status IN ('pending', 'generating_script', 'awaiting_script_approval', 
                  'generating_voice', 'awaiting_voice_approval', 
                  'fetching_video', 'assembling', 'completed', 'failed'));

-- storyboards table  
ALTER TABLE storyboards
ADD CONSTRAINT check_storyboard_status
CHECK (status IN ('draft', 'generating', 'completed', 'failed'));

-- workflow_executions table
ALTER TABLE workflow_executions
ADD CONSTRAINT check_workflow_status
CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled'));

-- Add constraints for logging tables with fixed levels
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_error_severity') THEN
    ALTER TABLE error_events
    ADD CONSTRAINT check_error_severity
    CHECK (severity IN ('info', 'warn', 'error', 'critical'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_log_level') THEN
    ALTER TABLE function_logs
    ADD CONSTRAINT check_log_level
    CHECK (log_level IN ('debug', 'info', 'warn', 'error', 'critical'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_test_log_level') THEN
    ALTER TABLE test_execution_logs
    ADD CONSTRAINT check_test_log_level
    CHECK (log_level IN ('debug', 'info', 'warn', 'error', 'critical'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_test_run_status') THEN
    ALTER TABLE test_execution_runs
    ADD CONSTRAINT check_test_run_status
    CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled'));
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON CONSTRAINT check_generation_status ON generations 
  IS 'Enforces valid generation status values: pending, processing, completed, failed, cancelled';
COMMENT ON CONSTRAINT check_video_job_status ON video_jobs 
  IS 'Enforces valid video job workflow status values';
COMMENT ON CONSTRAINT check_storyboard_status ON storyboards 
  IS 'Enforces valid storyboard status values: draft, generating, completed, failed';
COMMENT ON CONSTRAINT check_workflow_status ON workflow_executions 
  IS 'Enforces valid workflow execution status values';

-- Note: Views (user_available_credits, user_content_history, template_landing_pages_public, 
-- community_creations_public, webhook_analytics_summary) inherit RLS from their base tables.
-- No additional RLS policies needed on views themselves.