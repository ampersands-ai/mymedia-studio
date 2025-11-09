-- Fix security definer warning by explicitly setting SECURITY INVOKER
DROP VIEW IF EXISTS model_health_summary;

CREATE VIEW model_health_summary 
WITH (security_invoker = true)
AS
SELECT 
  m.record_id,
  m.id as model_id,
  m.model_name,
  m.provider,
  m.content_type,
  m.is_active,
  m.groups,
  COUNT(r.id) FILTER (WHERE r.test_started_at > NOW() - INTERVAL '24 hours') as total_tests_24h,
  COUNT(r.id) FILTER (WHERE r.status = 'success' AND r.test_started_at > NOW() - INTERVAL '24 hours') as successful_tests_24h,
  COUNT(r.id) FILTER (WHERE r.status IN ('failed', 'timeout', 'error') AND r.test_started_at > NOW() - INTERVAL '24 hours') as failed_tests_24h,
  CASE 
    WHEN COUNT(r.id) FILTER (WHERE r.test_started_at > NOW() - INTERVAL '24 hours') > 0 
    THEN (COUNT(r.id) FILTER (WHERE r.status = 'success' AND r.test_started_at > NOW() - INTERVAL '24 hours')::numeric / 
          COUNT(r.id) FILTER (WHERE r.test_started_at > NOW() - INTERVAL '24 hours')::numeric * 100)
    ELSE NULL 
  END as success_rate_percent_24h,
  AVG(r.total_latency_ms) FILTER (WHERE r.status = 'success' AND r.test_started_at > NOW() - INTERVAL '24 hours') as avg_latency_ms,
  MAX(r.total_latency_ms) FILTER (WHERE r.status = 'success' AND r.test_started_at > NOW() - INTERVAL '24 hours') as max_latency_ms,
  MIN(r.total_latency_ms) FILTER (WHERE r.status = 'success' AND r.test_started_at > NOW() - INTERVAL '24 hours') as min_latency_ms,
  MAX(r.test_started_at) as last_test_at,
  ARRAY_AGG(DISTINCT r.error_code) FILTER (WHERE r.error_code IS NOT NULL AND r.test_started_at > NOW() - INTERVAL '24 hours') as recent_error_codes,
  c.deduct_credits,
  c.timeout_seconds
FROM ai_models m
LEFT JOIN model_test_results r ON r.model_record_id = m.record_id
LEFT JOIN model_test_configs c ON c.model_record_id = m.record_id
GROUP BY m.record_id, m.id, m.model_name, m.provider, m.content_type, m.is_active, m.groups, c.deduct_credits, c.timeout_seconds;