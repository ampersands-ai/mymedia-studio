-- Create audit log retention cleanup function
-- Keeps logs for 90 days by default, removes older entries

CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.audit_logs
  WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

-- Create function to sanitize error logs (remove sensitive stack traces for non-admins)
CREATE OR REPLACE FUNCTION public.get_sanitized_error_logs(
  p_user_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  category TEXT,
  message TEXT,
  severity TEXT,
  created_at TIMESTAMPTZ,
  resolved BOOLEAN,
  user_facing BOOLEAN,
  user_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only return non-sensitive fields
  -- Stack traces and detailed metadata are excluded
  RETURN QUERY
  SELECT 
    e.id,
    e.category,
    e.message,
    e.severity,
    e.created_at,
    e.resolved,
    e.user_facing,
    e.user_message
  FROM public.error_events e
  WHERE (p_user_id IS NULL OR e.user_id = p_user_id)
  ORDER BY e.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Create comprehensive cleanup function for all log tables
CREATE OR REPLACE FUNCTION public.cleanup_all_old_logs()
RETURNS TABLE (
  table_name TEXT,
  deleted_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  audit_deleted INTEGER := 0;
  function_deleted INTEGER := 0;
  webhook_deleted INTEGER := 0;
  error_deleted INTEGER := 0;
  api_call_deleted INTEGER := 0;
BEGIN
  -- Cleanup audit logs (90 days)
  DELETE FROM public.audit_logs
  WHERE created_at < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS audit_deleted = ROW_COUNT;
  
  -- Cleanup function logs (30 days) - already exists but call it
  DELETE FROM public.function_logs
  WHERE created_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS function_deleted = ROW_COUNT;
  
  -- Cleanup webhook events (30 days)
  DELETE FROM public.webhook_events
  WHERE created_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS webhook_deleted = ROW_COUNT;
  
  -- Cleanup resolved error events (60 days)
  DELETE FROM public.error_events
  WHERE resolved = true AND created_at < NOW() - INTERVAL '60 days';
  GET DIAGNOSTICS error_deleted = ROW_COUNT;
  
  -- Cleanup API call logs (30 days)
  DELETE FROM public.api_call_logs
  WHERE created_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS api_call_deleted = ROW_COUNT;
  
  -- Return results
  RETURN QUERY VALUES
    ('audit_logs'::TEXT, audit_deleted),
    ('function_logs'::TEXT, function_deleted),
    ('webhook_events'::TEXT, webhook_deleted),
    ('error_events'::TEXT, error_deleted),
    ('api_call_logs'::TEXT, api_call_deleted);
END;
$$;

-- Grant execute permission to authenticated users for sanitized error logs
GRANT EXECUTE ON FUNCTION public.get_sanitized_error_logs TO authenticated;

-- Only admins can run cleanup functions
-- These should be called via cron or admin interface