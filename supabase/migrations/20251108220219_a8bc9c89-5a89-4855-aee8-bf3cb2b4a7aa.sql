-- Create model_test_results table for tracking test executions
CREATE TABLE IF NOT EXISTS public.model_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_record_id UUID REFERENCES public.ai_models(record_id) ON DELETE CASCADE NOT NULL,
  test_started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  test_completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Test configuration
  test_prompt TEXT NOT NULL,
  test_parameters JSONB DEFAULT '{}'::jsonb,
  test_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Flow tracking (array of step objects)
  flow_steps JSONB[] DEFAULT ARRAY[]::JSONB[],
  
  -- Results
  status TEXT NOT NULL CHECK (status IN ('running', 'success', 'failed', 'timeout', 'error')),
  generation_id UUID REFERENCES public.generations(id) ON DELETE SET NULL,
  output_url TEXT,
  error_code TEXT,
  error_message TEXT,
  error_stack TEXT,
  
  -- Performance metrics (milliseconds)
  total_latency_ms INTEGER,
  credit_check_ms INTEGER,
  credit_deduct_ms INTEGER,
  generation_submit_ms INTEGER,
  polling_duration_ms INTEGER,
  output_receive_ms INTEGER,
  storage_save_ms INTEGER,
  
  -- Credits tracking
  credits_required NUMERIC,
  credits_available_before NUMERIC,
  credits_deducted BOOLEAN DEFAULT false,
  credits_refunded BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_model_test_results_model ON public.model_test_results(model_record_id);
CREATE INDEX idx_model_test_results_status ON public.model_test_results(status);
CREATE INDEX idx_model_test_results_created ON public.model_test_results(created_at DESC);
CREATE INDEX idx_model_test_results_test_started ON public.model_test_results(test_started_at DESC);

-- Create model_test_configs table for storing test configurations
CREATE TABLE IF NOT EXISTS public.model_test_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_record_id UUID REFERENCES public.ai_models(record_id) ON DELETE CASCADE NOT NULL UNIQUE,
  
  -- Test input
  prompt_template TEXT NOT NULL DEFAULT 'A beautiful sunset over mountains',
  custom_parameters JSONB DEFAULT '{}'::jsonb,
  num_outputs INTEGER DEFAULT 1,
  
  -- Test options
  deduct_credits BOOLEAN DEFAULT false,
  test_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  timeout_seconds INTEGER DEFAULT 120,
  retry_on_failure BOOLEAN DEFAULT false,
  max_retries INTEGER DEFAULT 3,
  save_outputs BOOLEAN DEFAULT true,
  
  -- Validation
  expected_format TEXT CHECK (expected_format IN ('image', 'video', 'audio', 'text')),
  max_latency_threshold INTEGER DEFAULT 60,
  validate_file_accessible BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on model_record_id
CREATE INDEX idx_model_test_configs_model ON public.model_test_configs(model_record_id);

-- Create view for model health summary
CREATE OR REPLACE VIEW public.model_health_summary AS
SELECT 
  am.record_id,
  am.id as model_id,
  am.model_name,
  am.provider,
  am.content_type,
  am.is_active,
  
  -- Test counts (last 24 hours)
  COUNT(mtr.id) FILTER (WHERE mtr.test_started_at > NOW() - INTERVAL '24 hours') as total_tests_24h,
  COUNT(mtr.id) FILTER (WHERE mtr.status = 'success' AND mtr.test_started_at > NOW() - INTERVAL '24 hours') as successful_tests_24h,
  COUNT(mtr.id) FILTER (WHERE mtr.status IN ('failed', 'timeout', 'error') AND mtr.test_started_at > NOW() - INTERVAL '24 hours') as failed_tests_24h,
  
  -- Success rate (last 24 hours)
  ROUND(
    100.0 * COUNT(mtr.id) FILTER (WHERE mtr.status = 'success' AND mtr.test_started_at > NOW() - INTERVAL '24 hours') / 
    NULLIF(COUNT(mtr.id) FILTER (WHERE mtr.test_started_at > NOW() - INTERVAL '24 hours'), 0),
    2
  ) as success_rate_percent_24h,
  
  -- Performance metrics (last 24 hours, successful tests only)
  ROUND(AVG(mtr.total_latency_ms) FILTER (WHERE mtr.status = 'success' AND mtr.test_started_at > NOW() - INTERVAL '24 hours')) as avg_latency_ms,
  MAX(mtr.total_latency_ms) FILTER (WHERE mtr.status = 'success' AND mtr.test_started_at > NOW() - INTERVAL '24 hours') as max_latency_ms,
  MIN(mtr.total_latency_ms) FILTER (WHERE mtr.status = 'success' AND mtr.test_started_at > NOW() - INTERVAL '24 hours') as min_latency_ms,
  
  -- Timestamps
  MAX(mtr.test_started_at) as last_test_at,
  
  -- Error summary (last 24 hours)
  ARRAY_AGG(DISTINCT mtr.error_code) FILTER (WHERE mtr.error_code IS NOT NULL AND mtr.test_started_at > NOW() - INTERVAL '24 hours') as recent_error_codes,
  
  -- Test config
  mtc.deduct_credits,
  mtc.timeout_seconds
  
FROM public.ai_models am
LEFT JOIN public.model_test_results mtr ON am.record_id = mtr.model_record_id
LEFT JOIN public.model_test_configs mtc ON am.record_id = mtc.model_record_id
GROUP BY 
  am.record_id, 
  am.id, 
  am.model_name, 
  am.provider, 
  am.content_type, 
  am.is_active,
  mtc.deduct_credits,
  mtc.timeout_seconds;

-- Enable RLS on model_test_results
ALTER TABLE public.model_test_results ENABLE ROW LEVEL SECURITY;

-- RLS policies for model_test_results (admin-only access)
CREATE POLICY "Admins can view all test results"
  ON public.model_test_results
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert test results"
  ON public.model_test_results
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update test results"
  ON public.model_test_results
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can manage test results"
  ON public.model_test_results
  FOR ALL
  USING (true);

-- Enable RLS on model_test_configs
ALTER TABLE public.model_test_configs ENABLE ROW LEVEL SECURITY;

-- RLS policies for model_test_configs (admin-only access)
CREATE POLICY "Admins can manage test configs"
  ON public.model_test_configs
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at on model_test_results
CREATE TRIGGER update_model_test_results_updated_at
  BEFORE UPDATE ON public.model_test_results
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Add trigger for updated_at on model_test_configs
CREATE TRIGGER update_model_test_configs_updated_at
  BEFORE UPDATE ON public.model_test_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();