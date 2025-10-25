-- Add cron job to automatically recover stuck video jobs every 5 minutes
SELECT cron.schedule(
  'recover-stuck-video-jobs',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT net.http_post(
    url := 'https://gzlwkvmivbfcvczoqphq.supabase.co/functions/v1/recover-stuck-jobs',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6bHdrdm1pdmJmY3Zjem9xcGhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzOTI3MDgsImV4cCI6MjA3NDk2ODcwOH0.i8daJuqyXXIOMjhOIGM1ol8RqtCEN9bwe4IGCxN2Epo'
    ),
    body := jsonb_build_object('timestamp', now())
  ) AS request_id;
  $$
);