-- Fix the monitor-video-jobs-timeout cron job configuration error
-- The original cron job tried to use current_setting('app.settings.service_role_key')
-- which doesn't exist. Replace with hardcoded anon key like other cron jobs.

-- Remove the broken cron job
SELECT cron.unschedule('monitor-video-jobs-timeout') 
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'monitor-video-jobs-timeout'
);

-- Recreate with proper authorization header
SELECT cron.schedule(
  'monitor-video-jobs-timeout',
  '*/5 * * * *',  -- Every 5 minutes
  $$
  SELECT net.http_post(
    url := 'https://gzlwkvmivbfcvczoqphq.supabase.co/functions/v1/monitor-video-jobs',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6bHdrdm1pdmJmY3Zjem9xcGhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzOTI3MDgsImV4cCI6MjA3NDk2ODcwOH0.i8daJuqyXXIOMjhOIGM1ol8RqtCEN9bwe4IGCxN2Epo"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);