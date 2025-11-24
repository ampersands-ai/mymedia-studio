-- Create test_execution_runs table
CREATE TABLE test_execution_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_run_id uuid UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  admin_user_id uuid REFERENCES auth.users(id),
  model_record_id text NOT NULL,
  model_name text NOT NULL,
  model_provider text NOT NULL,
  generation_id uuid REFERENCES generations(id),
  execution_data jsonb NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  test_mode_enabled boolean DEFAULT true,
  skip_billing boolean DEFAULT true,
  duration_ms integer,
  steps_completed integer DEFAULT 0,
  steps_total integer DEFAULT 0,
  error_message text,
  error_stack text,
  started_at timestamptz,
  completed_at timestamptz,
  bookmarked boolean DEFAULT false,
  bookmark_name text,
  tags text[],
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create test_execution_logs table
CREATE TABLE test_execution_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_run_id uuid NOT NULL,
  generation_id uuid REFERENCES generations(id),
  step_number integer NOT NULL,
  parent_step_number integer,
  step_type text NOT NULL CHECK (step_type IN ('main', 'sub', 'log', 'error', 'warning')),
  log_level text NOT NULL CHECK (log_level IN ('debug', 'info', 'warn', 'error', 'critical')),
  message text NOT NULL,
  data jsonb,
  metadata jsonb,
  execution_context text NOT NULL CHECK (execution_context IN ('client', 'edge_function', 'webhook', 'database')),
  function_name text,
  file_path text,
  line_number integer,
  timestamp timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create test_execution_snapshots table
CREATE TABLE test_execution_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_run_id uuid NOT NULL,
  step_number integer NOT NULL,
  snapshot_type text NOT NULL CHECK (snapshot_type IN ('before', 'after', 'edited')),
  state_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(test_run_id, step_number, snapshot_type)
);

-- Create indexes
CREATE INDEX idx_test_runs_admin_user ON test_execution_runs(admin_user_id);
CREATE INDEX idx_test_runs_model ON test_execution_runs(model_record_id);
CREATE INDEX idx_test_runs_status ON test_execution_runs(status);
CREATE INDEX idx_test_runs_created_at ON test_execution_runs(created_at DESC);
CREATE INDEX idx_test_logs_run_id ON test_execution_logs(test_run_id);
CREATE INDEX idx_test_logs_step ON test_execution_logs(test_run_id, step_number);
CREATE INDEX idx_test_logs_timestamp ON test_execution_logs(timestamp DESC);
CREATE INDEX idx_test_snapshots_run_step ON test_execution_snapshots(test_run_id, step_number);

-- Enable RLS
ALTER TABLE test_execution_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_execution_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_execution_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS policies for test_execution_runs
CREATE POLICY "Admins can view test runs" ON test_execution_runs
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert test runs" ON test_execution_runs
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update test runs" ON test_execution_runs
  FOR UPDATE USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete test runs" ON test_execution_runs
  FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- RLS policies for test_execution_logs
CREATE POLICY "Admins can view test logs" ON test_execution_logs
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert test logs" ON test_execution_logs
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

-- RLS policies for test_execution_snapshots
CREATE POLICY "Admins can view snapshots" ON test_execution_snapshots
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert snapshots" ON test_execution_snapshots
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));