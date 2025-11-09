-- Create model test schedules table
CREATE TABLE IF NOT EXISTS public.model_test_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_record_id UUID NOT NULL,
  schedule_name TEXT NOT NULL,
  cron_expression TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  test_config JSONB DEFAULT '{}'::jsonb,
  last_run_at TIMESTAMP WITH TIME ZONE,
  next_run_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for active schedules
CREATE INDEX IF NOT EXISTS idx_model_test_schedules_active ON public.model_test_schedules(is_active, next_run_at);
CREATE INDEX IF NOT EXISTS idx_model_test_schedules_model ON public.model_test_schedules(model_record_id);

-- Enable RLS
ALTER TABLE public.model_test_schedules ENABLE ROW LEVEL SECURITY;

-- RLS policies for model test schedules (admin only)
CREATE POLICY "Admin users can view test schedules"
  ON public.model_test_schedules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admin users can insert test schedules"
  ON public.model_test_schedules FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admin users can update test schedules"
  ON public.model_test_schedules FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admin users can delete test schedules"
  ON public.model_test_schedules FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Add trigger for updated_at
CREATE TRIGGER update_model_test_schedules_updated_at
  BEFORE UPDATE ON public.model_test_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Extend app_settings with model failure alert settings
INSERT INTO public.app_settings (setting_key, setting_value) 
VALUES 
  ('model_failure_threshold', '3'::jsonb),
  ('model_failure_window_minutes', '60'::jsonb),
  ('model_alerts_enabled', 'true'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;