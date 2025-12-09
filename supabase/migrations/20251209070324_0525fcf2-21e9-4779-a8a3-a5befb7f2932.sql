-- =============================================
-- SECURITY FIXES MIGRATION
-- =============================================

-- Phase 1: Store anon key in Vault (if not exists)
DO $$
BEGIN
  -- Check if secret already exists
  IF NOT EXISTS (
    SELECT 1 FROM vault.decrypted_secrets 
    WHERE name = 'supabase_anon_key'
  ) THEN
    -- Create the secret
    PERFORM vault.create_secret(
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6bHdrdm1pdmJmY3Zjem9xcGhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzOTI3MDgsImV4cCI6MjA3NDk2ODcwOH0.i8daJuqyXXIOMjhOIGM1ol8RqtCEN9bwe4IGCxN2Epo',
      'supabase_anon_key',
      'Supabase anon key for cron job authentication'
    );
  END IF;
END $$;

-- Grant access to postgres role for cron jobs
GRANT SELECT ON vault.decrypted_secrets TO postgres;

-- =============================================
-- Phase 2: Update Cron Jobs to use get_auth_headers()
-- =============================================

-- Remove old cron jobs with hardcoded tokens
SELECT cron.unschedule('cleanup-stuck-generations-every-30-min');
SELECT cron.unschedule('monitor-model-health');
SELECT cron.unschedule('monitor-webhook-health');
SELECT cron.unschedule('run-scheduled-tests');

-- Recreate cleanup-stuck-generations with Vault auth
SELECT cron.schedule(
  'cleanup-stuck-generations-every-30-min',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://gzlwkvmivbfcvczoqphq.supabase.co/functions/v1/cleanup-stuck-generations',
    headers := public.get_auth_headers(),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Recreate monitor-model-health with Vault auth
SELECT cron.schedule(
  'monitor-model-health',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://gzlwkvmivbfcvczoqphq.supabase.co/functions/v1/monitor-model-health',
    headers := public.get_auth_headers(),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Recreate monitor-webhook-health with Vault auth
SELECT cron.schedule(
  'monitor-webhook-health',
  '*/10 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://gzlwkvmivbfcvczoqphq.supabase.co/functions/v1/monitor-webhook-health',
    headers := public.get_auth_headers(),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Recreate run-scheduled-tests with Vault auth
SELECT cron.schedule(
  'run-scheduled-tests',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://gzlwkvmivbfcvczoqphq.supabase.co/functions/v1/run-scheduled-tests',
    headers := public.get_auth_headers(),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- =============================================
-- Phase 3: Community Creations RLS Fix
-- =============================================

-- Add policy allowing public read access to generations shared in community
CREATE POLICY "Anyone can view community shared generations"
ON public.generations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.community_creations cc
    WHERE cc.generation_id = generations.id
  )
);

-- =============================================
-- Phase 4: Fix webhook_analytics_summary View
-- =============================================

DROP VIEW IF EXISTS public.webhook_analytics_summary;

CREATE VIEW public.webhook_analytics_summary
WITH (security_invoker = true)
AS
SELECT 
  date_trunc('hour'::text, created_at) AS hour,
  event_type,
  count(*) AS total_events,
  count(*) FILTER (WHERE processed_at IS NOT NULL) AS processed_count,
  count(*) FILTER (WHERE processed_at IS NULL) AS pending_count
FROM webhook_events
GROUP BY (date_trunc('hour'::text, created_at)), event_type;