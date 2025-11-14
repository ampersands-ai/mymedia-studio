-- API Health Check System
CREATE TABLE IF NOT EXISTS public.external_api_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  category text NOT NULL CHECK (category IN ('image', 'video', 'audio', 'storage', 'payment')),
  health_check_url text NOT NULL,
  health_check_method text DEFAULT 'GET' CHECK (health_check_method IN ('GET', 'POST', 'HEAD')),
  health_check_interval_minutes integer DEFAULT 5 CHECK (health_check_interval_minutes BETWEEN 1 AND 60),
  timeout_seconds integer DEFAULT 10 CHECK (timeout_seconds BETWEEN 1 AND 60),
  expected_status_code integer DEFAULT 200,
  expected_response_time_ms integer DEFAULT 3000,
  is_enabled boolean DEFAULT true,
  is_critical boolean DEFAULT true,
  alert_threshold integer DEFAULT 3,
  alert_email text[],
  alert_webhook_url text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.api_health_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_config_id uuid NOT NULL REFERENCES external_api_configs(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('healthy', 'degraded', 'unhealthy', 'timeout', 'error')),
  response_time_ms integer,
  status_code integer,
  error_message text,
  response_body text,
  response_headers jsonb,
  checked_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.api_health_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_config_id uuid NOT NULL REFERENCES external_api_configs(id) ON DELETE CASCADE,
  severity text NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
  message text NOT NULL,
  consecutive_failures integer DEFAULT 0,
  last_successful_check timestamptz,
  failure_started_at timestamptz,
  admins_notified boolean DEFAULT false,
  notified_at timestamptz,
  notification_method text,
  resolved boolean DEFAULT false,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_api_health_checks_api_config ON api_health_checks(api_config_id, checked_at DESC);
CREATE INDEX idx_api_health_checks_status ON api_health_checks(status, checked_at DESC);
CREATE INDEX idx_api_health_checks_unhealthy ON api_health_checks(api_config_id, checked_at DESC)
  WHERE status IN ('unhealthy', 'timeout', 'error');
CREATE INDEX idx_api_health_alerts_unresolved ON api_health_alerts(created_at DESC) WHERE resolved = false;
CREATE INDEX idx_api_health_alerts_severity ON api_health_alerts(severity, created_at DESC) WHERE resolved = false;

ALTER TABLE external_api_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_health_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_health_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view API configs" ON external_api_configs FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage API configs" ON external_api_configs FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view health checks" ON api_health_checks FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can insert health checks" ON api_health_checks FOR INSERT TO service_role
  WITH CHECK (true);

CREATE POLICY "Admins can view health alerts" ON api_health_alerts FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update health alerts" ON api_health_alerts FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can insert alerts" ON api_health_alerts FOR INSERT TO service_role
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.get_api_health_summary()
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
SET search_path = public
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
  LEFT JOIN uptime_stats us ON us.api_config_id = lc.api_config_id;
END;
$$;