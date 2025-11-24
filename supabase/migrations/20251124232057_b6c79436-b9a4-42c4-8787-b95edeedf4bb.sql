-- ============================================================================
-- SECURE CRON JOB MIGRATION - JWT Token moved to Supabase Vault
-- ============================================================================
-- This migration replaces hardcoded anon keys in cron jobs with secure
-- Vault-based authentication. All tokens are now encrypted and retrievable
-- only by authorized database functions.
--
-- PREREQUISITES:
-- 1. Vault extension must be installed: CREATE EXTENSION IF NOT EXISTS supabase_vault;
-- 2. New anon key must be stored in Vault with name 'supabase_anon_key'
--    Run: SELECT vault.create_secret('YOUR_NEW_ANON_KEY', 'supabase_anon_key');
--
-- This migration:
-- ✅ Drops all existing cron jobs that use hardcoded tokens
-- ✅ Creates secure helper function get_auth_headers() to retrieve token from Vault
-- ✅ Recreates all cron jobs using the secure helper function
-- ============================================================================

-- Ensure required extensions are enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

-- Drop all existing cron jobs with hardcoded tokens
DO $$
BEGIN
  -- Cleanup stuck generations (every 5 min)
  PERFORM cron.unschedule('cleanup-stuck-generations') 
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-stuck-generations');
  
  -- Recover stuck video jobs (every 5 min)
  PERFORM cron.unschedule('recover-stuck-video-jobs') 
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'recover-stuck-video-jobs');
  
  -- Send daily error summary (8 AM daily)
  PERFORM cron.unschedule('send-daily-error-summary') 
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-daily-error-summary');
  
  -- Check generation timeouts (every 2 min)
  PERFORM cron.unschedule('check-generation-timeouts') 
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'check-generation-timeouts');
  
  -- Auto-recover stuck generations (every 5 min)
  PERFORM cron.unschedule('auto-recover-stuck-generations') 
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-recover-stuck-generations');
  
  -- Monitor video jobs timeout (every 5 min)
  PERFORM cron.unschedule('monitor-video-jobs-timeout') 
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'monitor-video-jobs-timeout');
END $$;

-- Create secure helper function to retrieve auth headers from Vault
CREATE OR REPLACE FUNCTION public.get_auth_headers()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  anon_key TEXT;
BEGIN
  -- Retrieve the anon key from Vault
  SELECT decrypted_secret INTO anon_key
  FROM vault.decrypted_secrets
  WHERE name = 'supabase_anon_key'
  LIMIT 1;
  
  -- If no key found, raise error
  IF anon_key IS NULL THEN
    RAISE EXCEPTION 'Anon key not found in Vault. Run: SELECT vault.create_secret(''YOUR_KEY'', ''supabase_anon_key'')';
  END IF;
  
  -- Return properly formatted headers
  RETURN jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || anon_key
  );
END;
$$;

-- Recreate all cron jobs using secure Vault-based authentication
-- ============================================================================

-- 1. Cleanup stuck generations (every 5 minutes)
SELECT cron.schedule(
  'cleanup-stuck-generations',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://gzlwkvmivbfcvczoqphq.supabase.co/functions/v1/cleanup-stuck-generations',
    headers := public.get_auth_headers(),
    body := jsonb_build_object('timestamp', now())
  ) as request_id;
  $$
);

-- 2. Recover stuck video jobs (every 5 minutes)
SELECT cron.schedule(
  'recover-stuck-video-jobs',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://gzlwkvmivbfcvczoqphq.supabase.co/functions/v1/recover-stuck-jobs',
    headers := public.get_auth_headers(),
    body := jsonb_build_object('timestamp', now())
  ) as request_id;
  $$
);

-- 3. Send daily error summary (8 AM UTC every day)
SELECT cron.schedule(
  'send-daily-error-summary',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://gzlwkvmivbfcvczoqphq.supabase.co/functions/v1/send-daily-error-summary',
    headers := public.get_auth_headers(),
    body := '{}'::jsonb
  ) as request_id;
  $$
);

-- 4. Check generation timeouts (every 2 minutes)
SELECT cron.schedule(
  'check-generation-timeouts',
  '*/2 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://gzlwkvmivbfcvczoqphq.supabase.co/functions/v1/check-generation-timeouts',
    headers := public.get_auth_headers(),
    body := '{}'::jsonb
  ) as request_id;
  $$
);

-- 5. Auto-recover stuck generations (every 5 minutes)
SELECT cron.schedule(
  'auto-recover-stuck-generations',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://gzlwkvmivbfcvczoqphq.supabase.co/functions/v1/auto-recover-stuck-generations',
    headers := public.get_auth_headers(),
    body := '{}'::jsonb
  ) as request_id;
  $$
);

-- 6. Monitor video jobs timeout (every 5 minutes)
SELECT cron.schedule(
  'monitor-video-jobs-timeout',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://gzlwkvmivbfcvczoqphq.supabase.co/functions/v1/monitor-video-jobs',
    headers := public.get_auth_headers(),
    body := '{}'::jsonb
  ) as request_id;
  $$
);