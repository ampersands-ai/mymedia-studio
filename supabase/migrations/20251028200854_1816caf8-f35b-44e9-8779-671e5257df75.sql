-- Disable automatic timeout of video jobs
-- Remove the cron job that automatically fails stuck video jobs after 5 minutes
-- Jobs will now stay visible until user manually clicks "Reset"

SELECT cron.unschedule('check-stuck-video-jobs');