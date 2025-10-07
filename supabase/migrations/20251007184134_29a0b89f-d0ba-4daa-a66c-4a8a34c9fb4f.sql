-- Create a scheduled job to cleanup expired sessions daily at 2 AM UTC
-- This improves security by removing stale session data automatically

SELECT cron.schedule(
  'cleanup-expired-sessions',
  '0 2 * * *', -- Every day at 2 AM UTC
  $$
  SELECT public.cleanup_expired_sessions();
  $$
);