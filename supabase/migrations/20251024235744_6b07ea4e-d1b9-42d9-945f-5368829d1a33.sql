-- Create table for logging all external API calls
CREATE TABLE IF NOT EXISTS public.api_call_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Link to video job (nullable for non-video API calls)
  video_job_id uuid REFERENCES public.video_jobs(id) ON DELETE CASCADE,
  
  -- Link to generation (nullable for intermediate calls)
  generation_id uuid REFERENCES public.generations(id) ON DELETE SET NULL,
  
  -- User who initiated the call
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- API service identification
  service_name text NOT NULL CHECK (service_name IN ('elevenlabs', 'anthropic', 'pexels', 'shotstack', 'other')),
  endpoint text NOT NULL,
  http_method text NOT NULL DEFAULT 'POST' CHECK (http_method IN ('GET', 'POST', 'PUT', 'DELETE', 'PATCH')),
  
  -- Request details
  request_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  request_headers jsonb DEFAULT '{}'::jsonb,
  request_sent_at timestamptz NOT NULL DEFAULT now(),
  
  -- Response details
  response_payload jsonb DEFAULT '{}'::jsonb,
  response_headers jsonb DEFAULT '{}'::jsonb,
  response_status_code integer,
  response_received_at timestamptz,
  
  -- Error tracking
  is_error boolean DEFAULT false,
  error_message text,
  error_details jsonb,
  
  -- Performance metrics
  latency_ms integer,
  
  -- Metadata
  step_name text,
  additional_metadata jsonb DEFAULT '{}'::jsonb,
  
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_call_logs_video_job_id ON public.api_call_logs(video_job_id);
CREATE INDEX IF NOT EXISTS idx_api_call_logs_generation_id ON public.api_call_logs(generation_id);
CREATE INDEX IF NOT EXISTS idx_api_call_logs_user_id ON public.api_call_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_call_logs_service_name ON public.api_call_logs(service_name);
CREATE INDEX IF NOT EXISTS idx_api_call_logs_created_at ON public.api_call_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.api_call_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can view all API call logs"
  ON public.api_call_logs
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own API call logs"
  ON public.api_call_logs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert API call logs"
  ON public.api_call_logs
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update API call logs"
  ON public.api_call_logs
  FOR UPDATE
  USING (true);