-- =====================================================
-- COMPREHENSIVE MODEL TESTING & DEBUGGING SYSTEM
-- Database Schema Migration
-- =====================================================
-- This migration creates the complete database infrastructure
-- for the admin model testing console with full execution tracking,
-- real-time logging, and security measures.

-- =====================================================
-- 1. TEST EXECUTION RUNS TABLE
-- =====================================================
-- Stores high-level test execution metadata and results
CREATE TABLE IF NOT EXISTS test_execution_runs (
  -- Primary identification
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_run_id uuid UNIQUE NOT NULL DEFAULT gen_random_uuid(),

  -- User and model information
  admin_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  model_record_id text NOT NULL,
  model_name text NOT NULL,
  model_provider text,
  model_content_type text,

  -- Associated generation
  generation_id uuid REFERENCES generations(id) ON DELETE SET NULL,

  -- Execution data
  execution_data jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Status tracking
  status text NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  total_steps int NOT NULL DEFAULT 0,
  completed_steps int NOT NULL DEFAULT 0,
  failed_step_number int,
  error_message text,

  -- Timing
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  total_duration_ms int,

  -- Test configuration
  test_mode_enabled boolean DEFAULT true,
  skip_billing boolean DEFAULT true,

  -- Bookmarking and organization
  bookmarked boolean DEFAULT false,
  bookmark_name text,
  tags text[] DEFAULT ARRAY[]::text[],
  notes text,

  -- Metadata
  environment text DEFAULT 'test',
  client_version text,
  user_agent text,

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- 2. TEST EXECUTION LOGS TABLE
-- =====================================================
-- Stores detailed step-by-step execution logs in real-time
CREATE TABLE IF NOT EXISTS test_execution_logs (
  -- Primary identification
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  test_run_id uuid NOT NULL REFERENCES test_execution_runs(test_run_id) ON DELETE CASCADE,
  generation_id uuid REFERENCES generations(id) ON DELETE SET NULL,

  -- Step information
  step_name text NOT NULL,
  step_number int NOT NULL,
  parent_step_number int, -- For sub-steps
  step_type text NOT NULL CHECK (step_type IN ('main', 'sub', 'log', 'error', 'warning')),

  -- Log details
  log_level text NOT NULL CHECK (log_level IN ('debug', 'info', 'warn', 'error', 'critical')),
  message text NOT NULL,

  -- Data payload
  data jsonb DEFAULT '{}'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,

  -- Source information
  function_name text,
  file_path text,
  line_number int,

  -- Timing
  timestamp timestamptz DEFAULT now(),
  duration_ms int,

  -- Context
  execution_context text, -- 'client', 'edge_function', 'webhook', 'database'

  -- Timestamps
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- 3. TEST EXECUTION SNAPSHOTS TABLE
-- =====================================================
-- Stores complete state snapshots at each step for replay capability
CREATE TABLE IF NOT EXISTS test_execution_snapshots (
  -- Primary identification
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  test_run_id uuid NOT NULL REFERENCES test_execution_runs(test_run_id) ON DELETE CASCADE,
  step_number int NOT NULL,

  -- Snapshot data
  step_name text NOT NULL,
  state_before jsonb NOT NULL DEFAULT '{}'::jsonb,
  state_after jsonb NOT NULL DEFAULT '{}'::jsonb,
  inputs jsonb NOT NULL DEFAULT '{}'::jsonb,
  outputs jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Code reference
  function_name text,
  file_path text,
  source_code text,

  -- Metadata
  can_edit boolean DEFAULT false,
  can_rerun boolean DEFAULT false,
  is_edited boolean DEFAULT false,

  -- Timing
  started_at timestamptz,
  completed_at timestamptz,
  duration_ms int,

  -- Timestamps
  created_at timestamptz DEFAULT now(),

  -- Ensure unique step per run
  UNIQUE(test_run_id, step_number)
);

-- =====================================================
-- 4. TEST EXECUTION COMPARISONS TABLE
-- =====================================================
-- Stores comparison metadata for side-by-side test run analysis
CREATE TABLE IF NOT EXISTS test_execution_comparisons (
  -- Primary identification
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Comparison metadata
  comparison_name text NOT NULL,
  description text,

  -- Runs being compared
  run_ids uuid[] NOT NULL,

  -- Analysis results
  differences_summary jsonb DEFAULT '{}'::jsonb,
  performance_delta jsonb DEFAULT '{}'::jsonb,

  -- User
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Timestamps
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- 5. INDEXES FOR PERFORMANCE
-- =====================================================

-- Test execution runs indexes
CREATE INDEX IF NOT EXISTS idx_test_runs_admin_user
  ON test_execution_runs(admin_user_id);

CREATE INDEX IF NOT EXISTS idx_test_runs_model
  ON test_execution_runs(model_record_id);

CREATE INDEX IF NOT EXISTS idx_test_runs_status
  ON test_execution_runs(status);

CREATE INDEX IF NOT EXISTS idx_test_runs_created_at
  ON test_execution_runs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_test_runs_bookmarked
  ON test_execution_runs(bookmarked)
  WHERE bookmarked = true;

CREATE INDEX IF NOT EXISTS idx_test_runs_generation
  ON test_execution_runs(generation_id);

-- GIN index for tags array search
CREATE INDEX IF NOT EXISTS idx_test_runs_tags
  ON test_execution_runs USING gin(tags);

-- Test execution logs indexes
CREATE INDEX IF NOT EXISTS idx_test_logs_run_id
  ON test_execution_logs(test_run_id);

CREATE INDEX IF NOT EXISTS idx_test_logs_step_number
  ON test_execution_logs(test_run_id, step_number);

CREATE INDEX IF NOT EXISTS idx_test_logs_timestamp
  ON test_execution_logs(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_test_logs_log_level
  ON test_execution_logs(log_level);

CREATE INDEX IF NOT EXISTS idx_test_logs_context
  ON test_execution_logs(execution_context);

-- Test execution snapshots indexes
CREATE INDEX IF NOT EXISTS idx_test_snapshots_run_id
  ON test_execution_snapshots(test_run_id);

CREATE INDEX IF NOT EXISTS idx_test_snapshots_step
  ON test_execution_snapshots(test_run_id, step_number);

-- Test execution comparisons indexes
CREATE INDEX IF NOT EXISTS idx_test_comparisons_created_by
  ON test_execution_comparisons(created_by);

-- GIN index for run_ids array
CREATE INDEX IF NOT EXISTS idx_test_comparisons_runs
  ON test_execution_comparisons USING gin(run_ids);

-- =====================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE test_execution_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_execution_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_execution_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_execution_comparisons ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (for idempotency)
DROP POLICY IF EXISTS "Admin users can view test runs" ON test_execution_runs;
DROP POLICY IF EXISTS "Admin users can insert test runs" ON test_execution_runs;
DROP POLICY IF EXISTS "Admin users can update test runs" ON test_execution_runs;
DROP POLICY IF EXISTS "Admin users can delete test runs" ON test_execution_runs;

DROP POLICY IF EXISTS "Admin users can view test logs" ON test_execution_logs;
DROP POLICY IF EXISTS "Admin users can insert test logs" ON test_execution_logs;

DROP POLICY IF EXISTS "Admin users can view test snapshots" ON test_execution_snapshots;
DROP POLICY IF EXISTS "Admin users can insert test snapshots" ON test_execution_snapshots;

DROP POLICY IF EXISTS "Admin users can view comparisons" ON test_execution_comparisons;
DROP POLICY IF EXISTS "Admin users can manage comparisons" ON test_execution_comparisons;

-- Create admin-only policies
-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test execution runs policies
CREATE POLICY "Admin users can view test runs"
  ON test_execution_runs FOR SELECT
  USING (is_admin_user());

CREATE POLICY "Admin users can insert test runs"
  ON test_execution_runs FOR INSERT
  WITH CHECK (is_admin_user());

CREATE POLICY "Admin users can update test runs"
  ON test_execution_runs FOR UPDATE
  USING (is_admin_user());

CREATE POLICY "Admin users can delete test runs"
  ON test_execution_runs FOR DELETE
  USING (is_admin_user());

-- Test execution logs policies
CREATE POLICY "Admin users can view test logs"
  ON test_execution_logs FOR SELECT
  USING (is_admin_user());

CREATE POLICY "Admin users can insert test logs"
  ON test_execution_logs FOR INSERT
  WITH CHECK (is_admin_user());

-- Service role can also insert logs (for edge functions)
CREATE POLICY "Service role can insert test logs"
  ON test_execution_logs FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Test execution snapshots policies
CREATE POLICY "Admin users can view test snapshots"
  ON test_execution_snapshots FOR SELECT
  USING (is_admin_user());

CREATE POLICY "Admin users can insert test snapshots"
  ON test_execution_snapshots FOR INSERT
  WITH CHECK (is_admin_user());

-- Test execution comparisons policies
CREATE POLICY "Admin users can view comparisons"
  ON test_execution_comparisons FOR SELECT
  USING (is_admin_user());

CREATE POLICY "Admin users can manage comparisons"
  ON test_execution_comparisons FOR ALL
  USING (is_admin_user());

-- =====================================================
-- 7. TRIGGERS FOR AUTO-UPDATING TIMESTAMPS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for test_execution_runs
DROP TRIGGER IF EXISTS update_test_runs_updated_at ON test_execution_runs;
CREATE TRIGGER update_test_runs_updated_at
  BEFORE UPDATE ON test_execution_runs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 8. HELPER FUNCTIONS
-- =====================================================

-- Function to get test run summary
CREATE OR REPLACE FUNCTION get_test_run_summary(run_id uuid)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'run_info', to_jsonb(tr.*),
    'total_logs', (SELECT count(*) FROM test_execution_logs WHERE test_run_id = tr.test_run_id),
    'error_count', (SELECT count(*) FROM test_execution_logs WHERE test_run_id = tr.test_run_id AND log_level = 'error'),
    'warning_count', (SELECT count(*) FROM test_execution_logs WHERE test_run_id = tr.test_run_id AND log_level = 'warn'),
    'steps', (SELECT jsonb_agg(to_jsonb(ts.*) ORDER BY step_number) FROM test_execution_snapshots ts WHERE ts.test_run_id = tr.test_run_id)
  ) INTO result
  FROM test_execution_runs tr
  WHERE tr.id = run_id OR tr.test_run_id = run_id;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old test runs
CREATE OR REPLACE FUNCTION cleanup_old_test_runs(days_to_keep int DEFAULT 30)
RETURNS int AS $$
DECLARE
  deleted_count int;
BEGIN
  -- Only cleanup non-bookmarked runs older than specified days
  DELETE FROM test_execution_runs
  WHERE created_at < (now() - (days_to_keep || ' days')::interval)
    AND bookmarked = false
    AND is_admin_user();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 9. REALTIME PUBLICATION FOR LOG STREAMING
-- =====================================================

-- Enable realtime for test_execution_logs table
ALTER PUBLICATION supabase_realtime ADD TABLE test_execution_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE test_execution_runs;

-- =====================================================
-- 10. COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE test_execution_runs IS
  'Stores metadata and results for comprehensive model test executions';

COMMENT ON TABLE test_execution_logs IS
  'Real-time execution logs for detailed step-by-step tracking';

COMMENT ON TABLE test_execution_snapshots IS
  'Complete state snapshots at each execution step for replay capability';

COMMENT ON TABLE test_execution_comparisons IS
  'Metadata for comparing multiple test runs side-by-side';

COMMENT ON FUNCTION is_admin_user() IS
  'Security helper function to verify if current user has admin role';

COMMENT ON FUNCTION get_test_run_summary(uuid) IS
  'Returns complete summary of a test run including all steps and logs';

COMMENT ON FUNCTION cleanup_old_test_runs(int) IS
  'Removes non-bookmarked test runs older than specified days (default 30)';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
