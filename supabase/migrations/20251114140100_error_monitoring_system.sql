-- Error Monitoring System
-- Purpose: Centralized error tracking for admin monitoring and user notifications
-- Created: 2025-11-14

-- ============================================================================
-- ERROR_EVENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.error_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Error classification
  severity text NOT NULL CHECK (severity IN ('critical', 'error', 'warning', 'info')),
  category text NOT NULL CHECK (category IN (
    'authentication', 'generation', 'payment', 'api', 'database',
    'webhook', 'video', 'storyboard', 'workflow', 'system', 'user_action'
  )),

  -- Error details
  message text NOT NULL,
  error_code text,
  stack_trace text,

  -- Context
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  request_id text,
  function_name text,
  endpoint text,

  -- Additional metadata
  metadata jsonb DEFAULT '{}'::jsonb,

  -- User impact
  user_facing boolean DEFAULT false,
  user_message text, -- Sanitized message shown to user

  -- Resolution tracking
  resolved boolean DEFAULT false,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_notes text,

  -- Admin notification
  admin_notified boolean DEFAULT false,
  notified_at timestamptz,

  -- Timestamps
  created_at timestamptz DEFAULT now(),

  -- Deduplication
  fingerprint text GENERATED ALWAYS AS (
    md5(category || '::' || COALESCE(error_code, '') || '::' || COALESCE(function_name, '') || '::' || message)
  ) STORED
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Critical path indexes
CREATE INDEX idx_error_events_created ON error_events(created_at DESC);
CREATE INDEX idx_error_events_severity ON error_events(severity, created_at DESC);
CREATE INDEX idx_error_events_category ON error_events(category, created_at DESC);
CREATE INDEX idx_error_events_user ON error_events(user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

-- Admin monitoring indexes
CREATE INDEX idx_error_events_unresolved ON error_events(created_at DESC)
  WHERE resolved = false;
CREATE INDEX idx_error_events_critical ON error_events(created_at DESC)
  WHERE severity IN ('critical', 'error') AND resolved = false;
CREATE INDEX idx_error_events_user_facing ON error_events(created_at DESC)
  WHERE user_facing = true;

-- Deduplication index
CREATE INDEX idx_error_events_fingerprint ON error_events(fingerprint, created_at DESC);

-- Admin notification index
CREATE INDEX idx_error_events_notify ON error_events(created_at DESC)
  WHERE admin_notified = false AND severity IN ('critical', 'error');

-- ============================================================================
-- USER_ERROR_NOTIFICATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_error_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  error_event_id uuid NOT NULL REFERENCES error_events(id) ON DELETE CASCADE,

  -- Notification details
  title text NOT NULL,
  message text NOT NULL,
  action_label text, -- e.g., "Retry", "Contact Support"
  action_url text,

  -- Status
  shown boolean DEFAULT false,
  shown_at timestamptz,
  dismissed boolean DEFAULT false,
  dismissed_at timestamptz,

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '24 hours')
);

-- ============================================================================
-- INDEXES FOR USER_ERROR_NOTIFICATIONS
-- ============================================================================

CREATE INDEX idx_user_error_notifications_user ON user_error_notifications(user_id, created_at DESC)
  WHERE dismissed = false AND expires_at > now();
CREATE INDEX idx_user_error_notifications_event ON user_error_notifications(error_event_id);

-- ============================================================================
-- SYSTEM_HEALTH_METRICS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.system_health_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Metric type
  metric_type text NOT NULL CHECK (metric_type IN (
    'error_rate', 'response_time', 'concurrent_users', 'queue_depth',
    'api_success_rate', 'database_connections', 'memory_usage'
  )),

  -- Metric values
  value numeric NOT NULL,
  threshold numeric,
  is_healthy boolean DEFAULT true,

  -- Context
  component text, -- e.g., 'runware-api', 'shotstack-api', 'database', 'edge-functions'
  metadata jsonb DEFAULT '{}'::jsonb,

  -- Timestamps
  measured_at timestamptz DEFAULT now()
);

-- ============================================================================
-- INDEXES FOR SYSTEM_HEALTH_METRICS
-- ============================================================================

CREATE INDEX idx_system_health_recent ON system_health_metrics(measured_at DESC);
CREATE INDEX idx_system_health_component ON system_health_metrics(component, measured_at DESC);
CREATE INDEX idx_system_health_unhealthy ON system_health_metrics(measured_at DESC)
  WHERE is_healthy = false;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE error_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_error_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_health_metrics ENABLE ROW LEVEL SECURITY;

-- Error events: Only admins can view all, users can't see any
CREATE POLICY "Admins can view all error events"
  ON error_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update error events"
  ON error_events FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Service role can insert error events
CREATE POLICY "Service role can insert error events"
  ON error_events FOR INSERT
  TO service_role
  WITH CHECK (true);

-- User error notifications: Users can only see their own
CREATE POLICY "Users can view their own error notifications"
  ON user_error_notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
  ON user_error_notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Service role can insert notifications
CREATE POLICY "Service role can insert notifications"
  ON user_error_notifications FOR INSERT
  TO service_role
  WITH CHECK (true);

-- System health metrics: Only admins can view
CREATE POLICY "Admins can view system health metrics"
  ON system_health_metrics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Service role can insert metrics
CREATE POLICY "Service role can insert health metrics"
  ON system_health_metrics FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to log errors from edge functions
CREATE OR REPLACE FUNCTION log_error_event(
  p_severity text,
  p_category text,
  p_message text,
  p_error_code text DEFAULT NULL,
  p_stack_trace text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_request_id text DEFAULT NULL,
  p_function_name text DEFAULT NULL,
  p_endpoint text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_user_facing boolean DEFAULT false,
  p_user_message text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_error_id uuid;
  v_fingerprint text;
  v_existing_error uuid;
BEGIN
  -- Generate fingerprint
  v_fingerprint := md5(p_category || '::' || COALESCE(p_error_code, '') || '::' || COALESCE(p_function_name, '') || '::' || p_message);

  -- Check for duplicate error in last 5 minutes
  SELECT id INTO v_existing_error
  FROM error_events
  WHERE fingerprint = v_fingerprint
    AND created_at > now() - interval '5 minutes'
  ORDER BY created_at DESC
  LIMIT 1;

  -- If duplicate, just return existing ID (prevents spam)
  IF v_existing_error IS NOT NULL THEN
    RETURN v_existing_error;
  END IF;

  -- Insert new error event
  INSERT INTO error_events (
    severity, category, message, error_code, stack_trace,
    user_id, request_id, function_name, endpoint, metadata,
    user_facing, user_message
  ) VALUES (
    p_severity, p_category, p_message, p_error_code, p_stack_trace,
    p_user_id, p_request_id, p_function_name, p_endpoint, p_metadata,
    p_user_facing, p_user_message
  )
  RETURNING id INTO v_error_id;

  -- If user-facing and user is authenticated, create notification
  IF p_user_facing AND p_user_id IS NOT NULL AND p_user_message IS NOT NULL THEN
    INSERT INTO user_error_notifications (
      user_id, error_event_id, title, message
    ) VALUES (
      p_user_id, v_error_id,
      CASE p_severity
        WHEN 'critical' THEN '⚠️ Service Temporarily Unavailable'
        WHEN 'error' THEN '❌ Something Went Wrong'
        WHEN 'warning' THEN '⚠️ Action Required'
        ELSE 'ℹ️ Notice'
      END,
      p_user_message
    );
  END IF;

  RETURN v_error_id;
END;
$$;

-- Function to resolve error
CREATE OR REPLACE FUNCTION resolve_error_event(
  p_error_id uuid,
  p_resolution_notes text DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE error_events
  SET
    resolved = true,
    resolved_at = now(),
    resolved_by = auth.uid(),
    resolution_notes = p_resolution_notes
  WHERE id = p_error_id;

  RETURN FOUND;
END;
$$;

-- Function to get error rate over time window
CREATE OR REPLACE FUNCTION get_error_rate(
  p_time_window interval DEFAULT interval '5 minutes',
  p_severity text DEFAULT NULL
) RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_error_count integer;
  v_total_requests integer;
BEGIN
  -- Count errors in time window
  SELECT COUNT(*)
  INTO v_error_count
  FROM error_events
  WHERE created_at > now() - p_time_window
    AND (p_severity IS NULL OR severity = p_severity);

  -- Estimate total requests (using function_logs as proxy)
  SELECT COUNT(*)
  INTO v_total_requests
  FROM function_logs
  WHERE created_at > now() - p_time_window;

  -- Return error rate (avoid division by zero)
  IF v_total_requests = 0 THEN
    RETURN 0;
  ELSE
    RETURN (v_error_count::numeric / v_total_requests::numeric);
  END IF;
END;
$$;

-- ============================================================================
-- CLEANUP: Auto-archive old errors (Cron job - must be configured separately)
-- ============================================================================

COMMENT ON TABLE error_events IS 'Centralized error tracking for monitoring and alerts';
COMMENT ON TABLE user_error_notifications IS 'User-facing error notifications with actions';
COMMENT ON TABLE system_health_metrics IS 'Real-time system health monitoring';
COMMENT ON FUNCTION log_error_event IS 'Logs error events with deduplication and user notifications';
COMMENT ON FUNCTION resolve_error_event IS 'Marks an error as resolved with notes';
COMMENT ON FUNCTION get_error_rate IS 'Calculates error rate over time window for alerting';
