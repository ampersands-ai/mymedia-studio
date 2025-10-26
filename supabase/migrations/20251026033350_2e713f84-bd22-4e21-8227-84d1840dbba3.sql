-- Fix existing video jobs with filename-only voiceover URLs
-- This migration updates all jobs that have voiceover_url containing only a filename
-- to include the full public URL for proper playback

UPDATE video_jobs
SET voiceover_url = CONCAT(
  'https://gzlwkvmivbfcvczoqphq.supabase.co/storage/v1/object/public/generated-content/',
  voiceover_url
)
WHERE voiceover_url IS NOT NULL
  AND voiceover_url NOT LIKE 'http%'
  AND status IN ('awaiting_voice_approval', 'fetching_video', 'assembling', 'completed');