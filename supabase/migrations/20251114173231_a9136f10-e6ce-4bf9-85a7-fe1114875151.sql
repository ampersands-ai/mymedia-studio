-- Error Monitoring System
-- Purpose: Centralized error tracking for admin monitoring and user notifications

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
  user_id uuid,
  request_id text,
  function_name text,
  endpoint text,

  -- Additional metadata
  metadata jsonb DEFAULT '{}'::jsonb,

  -- User impact
  user_facing boolean DEFAULT false,
  user_message text,

  -- Resolution tracking
  resolved boolean DEFAULT false,
  resolved_at timestamptz,
  resolved_by uuid,
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_error_events_created ON error_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_events_severity ON error_events(severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_events_category ON error_events(category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_events_user ON error_events(user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_error_events_unresolved ON error_events(created_at DESC) WHERE resolved = false;
CREATE INDEX IF NOT EXISTS idx_error_events_critical ON error_events(created_at DESC) WHERE severity IN ('critical', 'error') AND resolved = false;
CREATE INDEX IF NOT EXISTS idx_error_events_user_facing ON error_events(created_at DESC) WHERE user_facing = true;
CREATE INDEX IF NOT EXISTS idx_error_events_fingerprint ON error_events(fingerprint, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_events_notify ON error_events(created_at DESC) WHERE admin_notified = false AND severity IN ('critical', 'error');

-- ============================================================================
-- USER_ERROR_NOTIFICATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_error_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  error_event_id uuid NOT NULL REFERENCES error_events(id) ON DELETE CASCADE,

  -- Notification details
  title text NOT NULL,
  message text NOT NULL,
  action_label text,
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_notifs_user ON user_error_notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_notifs_active ON user_error_notifications(user_id, expires_at DESC) WHERE dismissed = false;
CREATE INDEX IF NOT EXISTS idx_user_notifs_unshown ON user_error_notifications(user_id, created_at DESC) WHERE shown = false AND dismissed = false;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Error Events: Admins can view all, service role can insert
ALTER TABLE error_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all error events" ON error_events
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can insert error events" ON error_events
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can update error events" ON error_events
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

-- User Error Notifications: Users see their own, service role creates
ALTER TABLE user_error_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own error notifications" ON user_error_notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert user notifications" ON user_error_notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own notifications" ON user_error_notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================================
-- RPC FUNCTIONS
-- ============================================================================

-- Resolve error event
CREATE OR REPLACE FUNCTION resolve_error_event(
  p_error_id uuid,
  p_resolution_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE error_events
  SET 
    resolved = true,
    resolved_at = now(),
    resolved_by = auth.uid(),
    resolution_notes = p_resolution_notes
  WHERE id = p_error_id;
END;
$$;