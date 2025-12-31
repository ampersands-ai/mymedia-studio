-- Add api_call_started_at column to track when the actual provider API call starts
ALTER TABLE generations 
ADD COLUMN IF NOT EXISTS api_call_started_at TIMESTAMPTZ;