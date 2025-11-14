-- API Health Check System
-- Purpose: Monitor external API health and alert admins
-- Created: 2025-11-14

-- ============================================================================
-- EXTERNAL_API_CONFIGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.external_api_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE, -- e.g., 'runware', 'shotstack', 'azure-tts'
  display_name text NOT NULL,
  category text NOT NULL CHECK (category IN ('image', 'video', 'audio', 'storage', 'payment')),

  -- Health check configuration
  health_check_url text NOT NULL,
  health_check_method text DEFAULT 'GET' CHECK (health_check_method IN ('GET', 'POST', 'HEAD')),
  health_check_interval_minutes integer DEFAULT 5 CHECK (health_check_interval_minutes BETWEEN 1 AND 60),
  timeout_seconds integer DEFAULT 10 CHECK (timeout_seconds BETWEEN 1 AND 60),

  -- Expected response
  expected_status_code integer DEFAULT 200,
  expected_response_time_ms integer DEFAULT 3000, -- Alert if response time > this

  -- Status
  is_enabled boolean DEFAULT true,
  is_critical boolean DEFAULT true, -- If true, alert admins immediately on failure

  -- Alert configuration
  alert_threshold integer DEFAULT 3, -- Alert after N consecutive failures
  alert_email text[], -- Admin emails to notify
  alert_webhook_url text, -- Slack/Discord webhook

  -- Metadata
  metadata jsonb DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- API_HEALTH_CHECKS TABLE (Historical data)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.api_health_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_config_id uuid NOT NULL REFERENCES external_api_configs(id) ON DELETE CASCADE,

  -- Check results
  status text NOT NULL CHECK (status IN ('healthy', 'degraded', 'unhealthy', 'timeout', 'error')),
  response_time_ms integer,
  status_code integer,
  error_message text,

  -- Response details
  response_body text,
  response_headers jsonb,

  -- Timestamps
  checked_at timestamptz DEFAULT now()
);

-- ============================================================================
-- API_HEALTH_ALERTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.api_health_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_config_id uuid NOT NULL REFERENCES external_api_configs(id) ON DELETE CASCADE,

  -- Alert details
  severity text NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
  message text NOT NULL,

  -- Alert context
  consecutive_failures integer DEFAULT 0,
  last_successful_check timestamptz,
  failure_started_at timestamptz,

  -- Notification status
  admins_notified boolean DEFAULT false,
  notified_at timestamptz,
  notification_method text, -- 'email', 'webhook', 'both'

  -- Resolution
  resolved boolean DEFAULT false,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_notes text,

  -- Timestamps
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Health checks
CREATE INDEX idx_api_health_checks_api_config ON api_health_checks(api_config_id, checked_at DESC);
CREATE INDEX idx_api_health_checks_status ON api_health_checks(status, checked_at DESC);
CREATE INDEX idx_api_health_checks_unhealthy ON api_health_checks(api_config_id, checked_at DESC)
  WHERE status IN ('unhealthy', 'timeout', 'error');

-- Alerts
CREATE INDEX idx_api_health_alerts_unresolved ON api_health_alerts(created_at DESC)
  WHERE resolved = false;
CREATE INDEX idx_api_health_alerts_api_config ON api_health_alerts(api_config_id, created_at DESC);
CREATE INDEX idx_api_health_alerts_severity ON api_health_alerts(severity, created_at DESC)
  WHERE resolved = false;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE external_api_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_health_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_health_alerts ENABLE ROW LEVEL SECURITY;

-- External API configs: Admins only
CREATE POLICY "Admins can view API configs"
  ON external_api_configs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage API configs"
  ON external_api_configs FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Health checks: Admins can view, service role can insert
CREATE POLICY "Admins can view health checks"
  ON api_health_checks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Service role can insert health checks"
  ON api_health_checks FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Health alerts: Admins can view and resolve
CREATE POLICY "Admins can view health alerts"
  ON api_health_alerts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update health alerts"
  ON api_health_alerts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Service role can insert alerts"
  ON api_health_alerts FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get current health status for all APIs
CREATE OR REPLACE FUNCTION get_api_health_summary()
RETURNS TABLE (
  api_name text,
  display_name text,
  category text,
  current_status text,
  last_check timestamptz,
  response_time_ms integer,
  uptime_percentage numeric,
  is_critical boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH latest_checks AS (
    SELECT DISTINCT ON (ac.id)
      ac.id as api_config_id,
      ac.name,
      ac.display_name,
      ac.category,
      ac.is_critical,
      hc.status,
      hc.checked_at,
      hc.response_time_ms
    FROM external_api_configs ac
    LEFT JOIN api_health_checks hc ON hc.api_config_id = ac.id
    WHERE ac.is_enabled = true
    ORDER BY ac.id, hc.checked_at DESC
  ),
  uptime_stats AS (
    SELECT
      hc.api_config_id,
      COUNT(*) FILTER (WHERE hc.status = 'healthy') * 100.0 / NULLIF(COUNT(*), 0) as uptime_pct
    FROM api_health_checks hc
    WHERE hc.checked_at > now() - interval '24 hours'
    GROUP BY hc.api_config_id
  )
  SELECT
    lc.name,
    lc.display_name,
    lc.category,
    COALESCE(lc.status, 'unknown') as current_status,
    lc.checked_at,
    lc.response_time_ms,
    COALESCE(us.uptime_pct, 100) as uptime_percentage,
    lc.is_critical
  FROM latest_checks lc
  LEFT JOIN uptime_stats us ON us.api_config_id = lc.api_config_id
  ORDER BY lc.is_critical DESC, lc.name;
END;
$$;

-- Resolve health alert
CREATE OR REPLACE FUNCTION resolve_api_health_alert(
  p_alert_id uuid,
  p_resolution_notes text DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE api_health_alerts
  SET
    resolved = true,
    resolved_at = now(),
    resolved_by = auth.uid(),
    resolution_notes = p_resolution_notes
  WHERE id = p_alert_id;

  RETURN FOUND;
END;
$$;

-- ============================================================================
-- SEED DEFAULT API CONFIGURATIONS
-- ============================================================================

INSERT INTO external_api_configs (name, display_name, category, health_check_url, is_critical, alert_threshold, expected_response_time_ms)
VALUES
  ('runware', 'Runware AI', 'image', 'https://api.runware.ai/v1/health', true, 3, 2000),
  ('kie-ai', 'Kie.ai', 'image', 'https://api.kie.ai/health', true, 3, 2000),
  ('shotstack', 'Shotstack Video', 'video', 'https://api.shotstack.io/v1/health', true, 3, 3000),
  ('azure-tts', 'Azure Text-to-Speech', 'audio', 'https://eastus.tts.speech.microsoft.com/cognitiveservices/v1', true, 3, 2000),
  ('elevenlabs', 'ElevenLabs', 'audio', 'https://api.elevenlabs.io/v1/user', true, 3, 2000),
  ('pixabay', 'Pixabay Stock Media', 'image', 'https://pixabay.com/api/', false, 5, 3000),
  ('supabase-storage', 'Supabase Storage', 'storage', 'https://api.supabase.co/v1/health', true, 2, 1000)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- AUTO-UPDATE TIMESTAMP
-- ============================================================================

CREATE OR REPLACE FUNCTION update_external_api_configs_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER external_api_configs_updated_at
BEFORE UPDATE ON external_api_configs
FOR EACH ROW
EXECUTE FUNCTION update_external_api_configs_timestamp();

-- ============================================================================
-- CLEANUP: Auto-archive old health checks (keep last 7 days)
-- ============================================================================

-- This should be run as a cron job
COMMENT ON TABLE api_health_checks IS 'Health check history. Automatically archive data older than 7 days.';

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE external_api_configs IS 'Configuration for external API health monitoring';
COMMENT ON TABLE api_health_alerts IS 'Health alerts for admin notification';
COMMENT ON FUNCTION get_api_health_summary IS 'Get current health status summary for all APIs';
COMMENT ON FUNCTION resolve_api_health_alert IS 'Mark health alert as resolved';
