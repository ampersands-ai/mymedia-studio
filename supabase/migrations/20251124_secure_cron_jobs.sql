-- ===============================================
-- SECURITY FIX: Replace hardcoded JWT tokens
-- ===============================================
--
-- This migration replaces hardcoded JWT tokens in cron jobs
-- with secure Vault references.
--
-- PREREQUISITE STEPS (must be done in Supabase Dashboard):
-- 1. Rotate the exposed anon key (Settings > API)
-- 2. Store new anon key in Vault as 'supabase_anon_key'
-- 3. Store project URL in Vault as 'supabase_project_url'
--
-- To store secrets in Vault, run in SQL Editor:
-- SELECT vault.create_secret('YOUR_NEW_ANON_KEY', 'supabase_anon_key');
-- SELECT vault.create_secret('https://gzlwkvmivbfcvczoqphq.supabase.co', 'supabase_project_url');
--
-- ===============================================

-- Enable Vault extension
CREATE EXTENSION IF NOT EXISTS supabase_vault;

-- Remove existing cron jobs with hardcoded tokens
SELECT cron.unschedule('send-daily-error-summary')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'send-daily-error-summary'
);

SELECT cron.unschedule('check-generation-timeouts')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'check-generation-timeouts'
);

SELECT cron.unschedule('auto-recover-stuck-generations')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'auto-recover-stuck-generations'
);

-- Helper function to build auth headers from Vault
CREATE OR REPLACE FUNCTION build_edge_function_headers()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  anon_key TEXT;
  auth_header TEXT;
BEGIN
  -- Retrieve anon key from Vault
  SELECT decrypted_secret INTO anon_key
  FROM vault.decrypted_secrets
  WHERE name = 'supabase_anon_key'
  LIMIT 1;

  IF anon_key IS NULL THEN
    RAISE EXCEPTION 'supabase_anon_key not found in Vault. Please create it first.';
  END IF;

  auth_header := 'Bearer ' || anon_key;

  RETURN jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', auth_header
  );
END;
$$;

-- Helper function to build edge function URL
CREATE OR REPLACE FUNCTION build_edge_function_url(function_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  project_url TEXT;
BEGIN
  -- Retrieve project URL from Vault
  SELECT decrypted_secret INTO project_url
  FROM vault.decrypted_secrets
  WHERE name = 'supabase_project_url'
  LIMIT 1;

  IF project_url IS NULL THEN
    RAISE EXCEPTION 'supabase_project_url not found in Vault. Please create it first.';
  END IF;

  RETURN project_url || '/functions/v1/' || function_name;
END;
$$;

-- Schedule daily error summary at 8 AM UTC every day
-- Uses Vault secrets instead of hardcoded tokens
SELECT cron.schedule(
  'send-daily-error-summary',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := build_edge_function_url('send-daily-error-summary'),
    headers := build_edge_function_headers(),
    body := '{}'::jsonb
  ) as request_id;
  $$
);

-- Schedule generation timeout check every 2 minutes
SELECT cron.schedule(
  'check-generation-timeouts',
  '*/2 * * * *',
  $$
  SELECT net.http_post(
    url := build_edge_function_url('check-generation-timeouts'),
    headers := build_edge_function_headers(),
    body := '{}'::jsonb
  ) as request_id;
  $$
);

-- Schedule auto-recovery every 5 minutes
SELECT cron.schedule(
  'auto-recover-stuck-generations',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := build_edge_function_url('auto-recover-stuck-generations'),
    headers := build_edge_function_headers(),
    body := '{}'::jsonb
  ) as request_id;
  $$
);

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION build_edge_function_headers() TO postgres;
GRANT EXECUTE ON FUNCTION build_edge_function_url(TEXT) TO postgres;

COMMENT ON FUNCTION build_edge_function_headers() IS 'Builds auth headers from Vault secrets for edge function calls';
COMMENT ON FUNCTION build_edge_function_url(TEXT) IS 'Builds edge function URL from Vault-stored project URL';
