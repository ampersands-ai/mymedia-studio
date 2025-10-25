-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create cron job to monitor video jobs every 5 minutes and refund tokens
SELECT cron.schedule(
  'monitor-video-jobs-timeout',
  '*/5 * * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://gzlwkvmivbfcvczoqphq.supabase.co/functions/v1/monitor-video-jobs',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := '{}'::jsonb
    ) as request_id;
  $$
);