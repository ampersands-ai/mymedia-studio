-- Fix webhook_analytics_summary view to use security_invoker
-- This ensures the view runs with the permissions of the calling user, not the view owner

DROP VIEW IF EXISTS public.webhook_analytics_summary;

CREATE VIEW public.webhook_analytics_summary
WITH (security_invoker = true)
AS
SELECT 
  date_trunc('hour', created_at) as hour,
  event_type,
  COUNT(*) as total_events,
  COUNT(*) FILTER (WHERE processed_at IS NOT NULL) as processed_count,
  COUNT(*) FILTER (WHERE processed_at IS NULL) as pending_count
FROM public.webhook_events
GROUP BY date_trunc('hour', created_at), event_type;