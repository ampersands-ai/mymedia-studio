-- Enable pg_cron extension (should already be enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension (should already be enabled)  
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove any existing cron jobs with same names (cleanup)
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

-- Schedule daily error summary at 8 AM UTC every day
SELECT cron.schedule(
  'send-daily-error-summary',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://gzlwkvmivbfcvczoqphq.supabase.co/functions/v1/send-daily-error-summary',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6bHdrdm1pdmJmY3Zjem9xcGhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzOTI3MDgsImV4cCI6MjA3NDk2ODcwOH0.i8daJuqyXXIOMjhOIGM1ol8RqtCEN9bwe4IGCxN2Epo"}'::jsonb,
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
    url := 'https://gzlwkvmivbfcvczoqphq.supabase.co/functions/v1/check-generation-timeouts',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6bHdrdm1pdmJmY3Zjem9xcGhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzOTI3MDgsImV4cCI6MjA3NDk2ODcwOH0.i8daJuqyXXIOMjhOIGM1ol8RqtCEN9bwe4IGCxN2Epo"}'::jsonb,
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
    url := 'https://gzlwkvmivbfcvczoqphq.supabase.co/functions/v1/auto-recover-stuck-generations',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6bHdrdm1pdmJmY3Zjem9xcGhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzOTI3MDgsImV4cCI6MjA3NDk2ODcwOH0.i8daJuqyXXIOMjhOIGM1ol8RqtCEN9bwe4IGCxN2Epo"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);