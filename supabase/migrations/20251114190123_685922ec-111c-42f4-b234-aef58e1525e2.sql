-- Fix security definer view warning by adding security_invoker to webhook_analytics_summary
DROP VIEW IF EXISTS webhook_analytics_summary;

CREATE OR REPLACE VIEW webhook_analytics_summary 
WITH (security_invoker = true) AS
SELECT 
  provider,
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as total_events,
  COUNT(*) FILTER (WHERE status = 'success') as success_count,
  COUNT(*) FILTER (WHERE status = 'failure') as failure_count,
  COUNT(*) FILTER (WHERE status = 'timeout') as timeout_count,
  ROUND(AVG(duration_ms) FILTER (WHERE status = 'success'), 2) as avg_duration_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) FILTER (WHERE status = 'success') as p95_duration_ms,
  MAX(duration_ms) FILTER (WHERE status = 'success') as max_duration_ms,
  MIN(created_at) as first_event,
  MAX(created_at) as last_event
FROM webhook_analytics
GROUP BY provider, DATE_TRUNC('hour', created_at);