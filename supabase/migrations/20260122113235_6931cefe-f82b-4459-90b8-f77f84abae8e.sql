-- Fix: Recreate view with SECURITY INVOKER to respect RLS of querying user
DROP VIEW IF EXISTS generation_ledger;

CREATE VIEW generation_ledger 
WITH (security_invoker = true)
AS
SELECT 
  g.id AS artifio_id,
  g.user_id,
  p.email AS user_email,
  p.display_name AS user_name,
  g.provider_task_id,
  g.model_id,
  g.model_record_id,
  g.type AS content_type,
  g.status,
  COALESCE(g.tokens_used, 0) AS credits_cost,
  COALESCE(g.tokens_charged, 0) AS tokens_charged,
  CASE 
    WHEN g.output_url IS NOT NULL OR g.storage_path IS NOT NULL 
    THEN TRUE ELSE FALSE 
  END AS has_output,
  g.created_at AS run_date,
  g.completed_at,
  COALESCE(g.setup_duration_ms, 0) + COALESCE(g.api_duration_ms, 0) AS total_duration_ms,
  g.setup_duration_ms,
  g.api_duration_ms,
  g.prompt,
  g.output_url,
  g.storage_path
FROM generations g
LEFT JOIN profiles p ON p.id = g.user_id;