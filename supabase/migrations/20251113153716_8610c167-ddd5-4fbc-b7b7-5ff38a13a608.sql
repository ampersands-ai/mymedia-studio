-- Phase 2B: Performance Metrics Table
CREATE TABLE IF NOT EXISTS function_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name TEXT NOT NULL,
  request_id TEXT,
  user_id UUID,
  duration_ms INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'timeout')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_performance_function ON function_performance_metrics(function_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_performance_user ON function_performance_metrics(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_performance_status ON function_performance_metrics(status, created_at DESC);

-- Phase 3A: Webhook Analytics Table
CREATE TABLE IF NOT EXISTS webhook_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL CHECK (provider IN ('kie-ai', 'dodo-payments', 'midjourney', 'json2video', 'shotstack', 'runware')),
  event_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failure', 'timeout')),
  duration_ms INTEGER,
  error_code TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_analytics_provider ON webhook_analytics(provider, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_analytics_status ON webhook_analytics(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_analytics_event ON webhook_analytics(event_type, created_at DESC);

-- Phase 3B: Real-time Aggregation View
CREATE OR REPLACE VIEW webhook_analytics_summary AS
SELECT 
  provider,
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as total_events,
  COUNT(*) FILTER (WHERE status = 'success') as success_count,
  COUNT(*) FILTER (WHERE status = 'failure') as failure_count,
  COUNT(*) FILTER (WHERE status = 'timeout') as timeout_count,
  ROUND(AVG(duration_ms) FILTER (WHERE status = 'success'), 2) as avg_duration_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) FILTER (WHERE status = 'success') as p95_duration_ms,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY duration_ms) FILTER (WHERE status = 'success') as p99_duration_ms
FROM webhook_analytics
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY provider, hour
ORDER BY hour DESC;

-- Phase 4A: Webhook Alert Configuration
CREATE TABLE IF NOT EXISTS webhook_alert_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL UNIQUE,
  failure_threshold INTEGER DEFAULT 5,
  timeout_threshold_ms INTEGER DEFAULT 30000,
  success_rate_threshold DECIMAL DEFAULT 0.90,
  alert_cooldown_minutes INTEGER DEFAULT 30,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Phase 4C: Webhook Health Alerts History
CREATE TABLE IF NOT EXISTS webhook_health_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('consecutive_failures', 'low_success_rate', 'high_latency', 'no_activity')),
  severity TEXT NOT NULL CHECK (severity IN ('warning', 'critical')),
  details JSONB DEFAULT '{}'::jsonb,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_health_provider ON webhook_health_alerts(provider, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_health_severity ON webhook_health_alerts(severity, resolved_at);

-- Insert default alert configurations
INSERT INTO webhook_alert_config (provider, failure_threshold, timeout_threshold_ms, success_rate_threshold)
VALUES 
  ('kie-ai', 5, 30000, 0.90),
  ('dodo-payments', 3, 15000, 0.95),
  ('midjourney', 5, 30000, 0.90),
  ('json2video', 5, 45000, 0.85)
ON CONFLICT (provider) DO NOTHING;

-- Enable RLS
ALTER TABLE function_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_alert_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_health_alerts ENABLE ROW LEVEL SECURITY;

-- Admin-only access to performance metrics
CREATE POLICY "Admins can view performance metrics" ON function_performance_metrics
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin-only access to webhook analytics
CREATE POLICY "Admins can view webhook analytics" ON webhook_analytics
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role can insert analytics
CREATE POLICY "Service role can insert webhook analytics" ON webhook_analytics
  FOR INSERT WITH CHECK (true);

-- Admin-only access to alert config
CREATE POLICY "Admins can manage alert config" ON webhook_alert_config
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin-only access to health alerts
CREATE POLICY "Admins can view health alerts" ON webhook_health_alerts
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));