-- Phase 2: Create security_config table for configurable thresholds
CREATE TABLE IF NOT EXISTS public.security_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT UNIQUE NOT NULL,
  config_value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.security_config ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write security config
CREATE POLICY "Admins can manage security config"
  ON public.security_config
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Insert default thresholds
INSERT INTO public.security_config (config_key, config_value, description) VALUES
  ('failed_login_threshold', '{"window_minutes": 15, "count": 5}'::jsonb, 'Failed login detection - triggers alert after N failed logins in window'),
  ('rapid_signup_threshold', '{"window_hours": 1, "count": 3}'::jsonb, 'Rapid account creation - triggers alert after N signups from same IP in window'),
  ('token_usage_threshold', '{"window_hours": 1, "tokens": 1000}'::jsonb, 'Unusual token usage - triggers alert when user exceeds token limit in window')
ON CONFLICT (config_key) DO NOTHING;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_security_config_key ON public.security_config(config_key);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION public.update_security_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER security_config_updated_at
  BEFORE UPDATE ON public.security_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_security_config_updated_at();