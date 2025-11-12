-- Edge function structured logs table
CREATE TABLE IF NOT EXISTS public.function_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name TEXT NOT NULL,
  log_level TEXT NOT NULL CHECK (log_level IN ('debug', 'info', 'warn', 'error', 'critical')),
  message TEXT NOT NULL,
  
  -- Context
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  request_id TEXT,
  duration_ms INTEGER,
  context JSONB,
  
  -- Error details (for error/critical levels)
  error_name TEXT,
  error_message TEXT,
  error_stack TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_function_logs_function_name ON public.function_logs(function_name);
CREATE INDEX idx_function_logs_level ON public.function_logs(log_level);
CREATE INDEX idx_function_logs_created_at ON public.function_logs(created_at DESC);
CREATE INDEX idx_function_logs_critical ON public.function_logs(function_name, log_level, created_at DESC)
  WHERE log_level IN ('error', 'critical');
CREATE INDEX idx_function_logs_user ON public.function_logs(user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

-- Enable RLS
ALTER TABLE public.function_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all function logs
CREATE POLICY "Admins can view function logs"
  ON public.function_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Auto-cleanup old logs (keep 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_function_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.function_logs
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$;

-- Schedule cleanup daily at 2 AM
SELECT cron.schedule(
  'cleanup-function-logs',
  '0 2 * * *',
  $$SELECT cleanup_old_function_logs()$$
);