-- Create function to automatically fail stuck video jobs after 5 minutes
CREATE OR REPLACE FUNCTION check_and_fail_stuck_jobs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE video_jobs
  SET 
    status = 'failed',
    error_message = 'Job automatically timed out after 5 minutes of inactivity',
    error_details = jsonb_build_object(
      'message', 'Automatic timeout',
      'step', status,
      'timestamp', NOW()::text,
      'auto_timeout', true
    ),
    updated_at = NOW()
  WHERE status IN ('pending', 'generating_script', 'awaiting_script_approval', 
                   'generating_voice', 'awaiting_voice_approval', 
                   'fetching_video', 'assembling')
  AND updated_at < NOW() - INTERVAL '5 minutes';
END;
$$;

-- Schedule the function to run every minute using pg_cron
SELECT cron.schedule(
  'check-stuck-video-jobs',
  '* * * * *',
  $$SELECT check_and_fail_stuck_jobs()$$
);