-- Add timing columns to track generation performance
-- setup_duration_ms: Time from button click to API call start (client-side prep)
-- api_duration_ms: Time from API call start to response received (server processing)

ALTER TABLE public.generations 
ADD COLUMN IF NOT EXISTS setup_duration_ms INTEGER,
ADD COLUMN IF NOT EXISTS api_duration_ms INTEGER;

-- Add comment for documentation
COMMENT ON COLUMN public.generations.setup_duration_ms IS 'Time in milliseconds from generation start to API call initiation (client-side preparation)';
COMMENT ON COLUMN public.generations.api_duration_ms IS 'Time in milliseconds from API call start to response received (server-side processing)';