-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create helper function to increment tokens (for refunds)
CREATE OR REPLACE FUNCTION public.increment_tokens(
  user_id_param UUID,
  amount INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.user_subscriptions
  SET tokens_remaining = tokens_remaining + amount
  WHERE user_id = user_id_param;
END;
$$;

-- Schedule the cleanup job to run every 5 minutes
SELECT cron.schedule(
  'cleanup-stuck-generations',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT
    net.http_post(
        url:='https://gzlwkvmivbfcvczoqphq.supabase.co/functions/v1/cleanup-stuck-generations',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6bHdrdm1pdmJmY3Zjem9xcGhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzOTI3MDgsImV4cCI6MjA3NDk2ODcwOH0.i8daJuqyXXIOMjhOIGM1ol8RqtCEN9bwe4IGCxN2Epo"}'::jsonb,
        body:=concat('{"timestamp": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);