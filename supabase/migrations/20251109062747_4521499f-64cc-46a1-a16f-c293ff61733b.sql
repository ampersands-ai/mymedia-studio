-- Add enhanced flow tracking columns to model_test_results
ALTER TABLE public.model_test_results
ADD COLUMN IF NOT EXISTS api_request_payload JSONB,
ADD COLUMN IF NOT EXISTS api_first_response JSONB,
ADD COLUMN IF NOT EXISTS api_final_response JSONB,
ADD COLUMN IF NOT EXISTS storage_metadata JSONB,
ADD COLUMN IF NOT EXISTS media_preview_url TEXT,
ADD COLUMN IF NOT EXISTS step_metadata JSONB DEFAULT '{}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.model_test_results.api_request_payload IS 'Full API request payload sent to provider';
COMMENT ON COLUMN public.model_test_results.api_first_response IS 'Initial response from provider (for async operations)';
COMMENT ON COLUMN public.model_test_results.api_final_response IS 'Final response from provider with output details';
COMMENT ON COLUMN public.model_test_results.storage_metadata IS 'Supabase storage details (bucket, path, size, etc.)';
COMMENT ON COLUMN public.model_test_results.media_preview_url IS 'Preview/thumbnail URL for generated media';
COMMENT ON COLUMN public.model_test_results.step_metadata IS 'Additional metadata for each flow step (hover data, retryability, etc.)';