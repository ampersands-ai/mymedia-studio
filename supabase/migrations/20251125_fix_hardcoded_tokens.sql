-- Migration: Replace hardcoded JWT tokens with Vault secrets
-- This migration fixes the security issue of hardcoded tokens in cron jobs
--
-- Prerequisites:
-- 1. Store the anon key in Vault first:
--    SELECT vault.create_secret('SUPABASE_ANON_KEY', 'your-anon-key-here', 'Supabase anon key for cron jobs');
--
-- 2. Grant access to the postgres role:
--    GRANT SELECT ON vault.decrypted_secrets TO postgres;

-- Enable vault extension if not already enabled
CREATE EXTENSION IF NOT EXISTS supabase_vault CASCADE;

-- Drop existing cron jobs that use hardcoded tokens
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

-- Recreate cron jobs using Vault-stored secrets
-- Note: These will only work after the SUPABASE_ANON_KEY is stored in Vault

-- Schedule daily error summary at 8 AM UTC every day
SELECT cron.schedule(
  'send-daily-error-summary',
  '0 8 * * *',
  $$
  DO $$
  DECLARE
    anon_key text;
  BEGIN
    -- Retrieve anon key from Vault
    SELECT decrypted_secret INTO anon_key
    FROM vault.decrypted_secrets
    WHERE name = 'SUPABASE_ANON_KEY'
    LIMIT 1;

    IF anon_key IS NULL THEN
      RAISE WARNING 'SUPABASE_ANON_KEY not found in Vault. Cron job skipped.';
      RETURN;
    END IF;

    -- Make HTTP request with Vault-stored token
    PERFORM net.http_post(
      url := 'https://gzlwkvmivbfcvczoqphq.supabase.co/functions/v1/send-daily-error-summary',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || anon_key
      ),
      body := '{}'::jsonb
    );
  END $$;
  $$
);

-- Schedule generation timeout check every 2 minutes
SELECT cron.schedule(
  'check-generation-timeouts',
  '*/2 * * * *',
  $$
  DO $$
  DECLARE
    anon_key text;
  BEGIN
    SELECT decrypted_secret INTO anon_key
    FROM vault.decrypted_secrets
    WHERE name = 'SUPABASE_ANON_KEY'
    LIMIT 1;

    IF anon_key IS NULL THEN
      RAISE WARNING 'SUPABASE_ANON_KEY not found in Vault. Cron job skipped.';
      RETURN;
    END IF;

    PERFORM net.http_post(
      url := 'https://gzlwkvmivbfcvczoqphq.supabase.co/functions/v1/check-generation-timeouts',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || anon_key
      ),
      body := '{}'::jsonb
    );
  END $$;
  $$
);

-- Schedule auto-recovery every 5 minutes
SELECT cron.schedule(
  'auto-recover-stuck-generations',
  '*/5 * * * *',
  $$
  DO $$
  DECLARE
    anon_key text;
  BEGIN
    SELECT decrypted_secret INTO anon_key
    FROM vault.decrypted_secrets
    WHERE name = 'SUPABASE_ANON_KEY'
    LIMIT 1;

    IF anon_key IS NULL THEN
      RAISE WARNING 'SUPABASE_ANON_KEY not found in Vault. Cron job skipped.';
      RETURN;
    END IF;

    PERFORM net.http_post(
      url := 'https://gzlwkvmivbfcvczoqphq.supabase.co/functions/v1/auto-recover-stuck-generations',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || anon_key
      ),
      body := '{}'::jsonb
    );
  END $$;
  $$
);

-- Add comment documenting the setup
COMMENT ON EXTENSION supabase_vault IS 'Stores sensitive data like API keys and tokens securely. Required for cron jobs.';
