-- Drop existing partial objects if any
DROP INDEX IF EXISTS idx_test_runs_created_at;
DROP INDEX IF EXISTS idx_test_runs_branch;
DROP INDEX IF EXISTS idx_test_runs_status;
DROP TABLE IF EXISTS public.test_runs;

-- Create test_runs table for storing test run history and trend analysis
CREATE TABLE public.test_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- Run metadata
  run_id TEXT NOT NULL,
  run_type TEXT NOT NULL CHECK (run_type IN ('unit', 'e2e', 'all')),
  trigger TEXT NOT NULL CHECK (trigger IN ('ci', 'manual', 'cron')),
  branch TEXT NOT NULL,
  commit_sha TEXT,
  author TEXT,
  logs_url TEXT,
  
  -- Results
  total_tests INTEGER NOT NULL DEFAULT 0,
  passed INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0,
  skipped INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER,
  
  -- Coverage (unit tests only)
  coverage_lines DECIMAL(5,2),
  coverage_functions DECIMAL(5,2),
  coverage_branches DECIMAL(5,2),
  coverage_statements DECIMAL(5,2),
  
  -- Failed tests details (JSON array)
  failed_tests JSONB DEFAULT '[]',
  
  -- Status
  status TEXT NOT NULL CHECK (status IN ('passed', 'failed', 'partial'))
);

-- Index for quick lookups
CREATE INDEX idx_test_runs_created_at ON public.test_runs(created_at DESC);
CREATE INDEX idx_test_runs_branch ON public.test_runs(branch);
CREATE INDEX idx_test_runs_status ON public.test_runs(status);

-- Enable RLS
ALTER TABLE public.test_runs ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (for edge functions)
CREATE POLICY "Service role can manage test_runs"
ON public.test_runs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Allow authenticated admins to view test runs (using user_roles table)
CREATE POLICY "Admins can view test_runs"
ON public.test_runs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);