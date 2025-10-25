-- Add actual_audio_duration column to video_jobs table
ALTER TABLE video_jobs 
ADD COLUMN actual_audio_duration NUMERIC;