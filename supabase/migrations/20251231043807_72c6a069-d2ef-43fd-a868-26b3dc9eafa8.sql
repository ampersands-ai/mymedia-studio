-- ============================================
-- PHASE 1: Rate Limits V2 Table for Sliding Window Rate Limiting
-- ============================================

-- Create rate_limits_v2 table for enhanced sliding window rate limiting
CREATE TABLE IF NOT EXISTS public.rate_limits_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  request_count INTEGER NOT NULL DEFAULT 0,
  request_timestamps BIGINT[] DEFAULT ARRAY[]::BIGINT[],
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_request_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  blocked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_v2_key ON public.rate_limits_v2(key);
CREATE INDEX IF NOT EXISTS idx_rate_limits_v2_blocked_until ON public.rate_limits_v2(blocked_until) WHERE blocked_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rate_limits_v2_last_request ON public.rate_limits_v2(last_request_at);

-- Enable RLS
ALTER TABLE public.rate_limits_v2 ENABLE ROW LEVEL SECURITY;

-- Only service role can access (edge functions use service role)
CREATE POLICY "Service role full access" ON public.rate_limits_v2
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Create function to automatically clean expired rate limit entries
CREATE OR REPLACE FUNCTION public.cleanup_expired_rate_limits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete entries that haven't been accessed in 24 hours
  DELETE FROM public.rate_limits_v2
  WHERE last_request_at < now() - INTERVAL '24 hours';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- ============================================
-- PHASE 5: System Metrics Table for Observability
-- ============================================

-- Create system_metrics table for persisting observability data
CREATE TABLE IF NOT EXISTS public.system_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  metric_unit TEXT,
  tags JSONB DEFAULT '{}',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_system_metrics_name ON public.system_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_system_metrics_recorded_at ON public.system_metrics(recorded_at);
CREATE INDEX IF NOT EXISTS idx_system_metrics_name_time ON public.system_metrics(metric_name, recorded_at DESC);

-- Enable RLS
ALTER TABLE public.system_metrics ENABLE ROW LEVEL SECURITY;

-- Only service role can write, admins can read
CREATE POLICY "Service role full access on system_metrics" ON public.system_metrics
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Create function to record a metric
CREATE OR REPLACE FUNCTION public.record_metric(
  p_name TEXT,
  p_value NUMERIC,
  p_unit TEXT DEFAULT NULL,
  p_tags JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO public.system_metrics (metric_name, metric_value, metric_unit, tags)
  VALUES (p_name, p_value, p_unit, p_tags)
  RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$;

-- Create function to get aggregated metrics
CREATE OR REPLACE FUNCTION public.get_metric_stats(
  p_name TEXT,
  p_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
  min_value NUMERIC,
  max_value NUMERIC,
  avg_value NUMERIC,
  count BIGINT,
  last_value NUMERIC,
  last_recorded_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    MIN(sm.metric_value) as min_value,
    MAX(sm.metric_value) as max_value,
    AVG(sm.metric_value) as avg_value,
    COUNT(*) as count,
    (SELECT sm2.metric_value FROM public.system_metrics sm2 
     WHERE sm2.metric_name = p_name 
     ORDER BY sm2.recorded_at DESC LIMIT 1) as last_value,
    (SELECT sm2.recorded_at FROM public.system_metrics sm2 
     WHERE sm2.metric_name = p_name 
     ORDER BY sm2.recorded_at DESC LIMIT 1) as last_recorded_at
  FROM public.system_metrics sm
  WHERE sm.metric_name = p_name
    AND sm.recorded_at > now() - (p_hours || ' hours')::INTERVAL;
END;
$$;

-- Create circuit_breaker_events table for tracking circuit breaker state changes
CREATE TABLE IF NOT EXISTS public.circuit_breaker_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  breaker_name TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('opened', 'closed', 'half_open', 'failure', 'success')),
  failure_count INTEGER,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for circuit breaker events
CREATE INDEX IF NOT EXISTS idx_circuit_breaker_events_name ON public.circuit_breaker_events(breaker_name);
CREATE INDEX IF NOT EXISTS idx_circuit_breaker_events_created ON public.circuit_breaker_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_circuit_breaker_events_type ON public.circuit_breaker_events(event_type);

-- Enable RLS
ALTER TABLE public.circuit_breaker_events ENABLE ROW LEVEL SECURITY;

-- Only service role can access
CREATE POLICY "Service role full access on circuit_breaker_events" ON public.circuit_breaker_events
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Update timestamp trigger for rate_limits_v2
CREATE OR REPLACE FUNCTION public.update_rate_limits_v2_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_rate_limits_v2_updated_at
  BEFORE UPDATE ON public.rate_limits_v2
  FOR EACH ROW
  EXECUTE FUNCTION public.update_rate_limits_v2_updated_at();