-- Phase 3: Create user error logs table
CREATE TABLE IF NOT EXISTS public.user_error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT,
  
  -- Error classification
  error_type TEXT NOT NULL CHECK (error_type IN ('react_error', 'js_error', 'network_error', 'api_error')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  category TEXT,
  
  -- Location
  route_name TEXT NOT NULL,
  route_path TEXT,
  component_name TEXT,
  
  -- Error details
  error_message TEXT NOT NULL,
  error_stack TEXT,
  component_stack TEXT,
  
  -- Context
  user_action TEXT,
  browser_info JSONB,
  viewport JSONB,
  
  -- Metadata
  metadata JSONB,
  
  -- Tracking
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT,
  alert_sent BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for user_error_logs
CREATE INDEX idx_user_error_logs_user_id ON public.user_error_logs(user_id);
CREATE INDEX idx_user_error_logs_created_at ON public.user_error_logs(created_at DESC);
CREATE INDEX idx_user_error_logs_severity ON public.user_error_logs(severity);
CREATE INDEX idx_user_error_logs_error_type ON public.user_error_logs(error_type);
CREATE INDEX idx_user_error_logs_is_resolved ON public.user_error_logs(is_resolved);

-- Enable RLS on user_error_logs
ALTER TABLE public.user_error_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own error logs
CREATE POLICY "Users can view own errors"
  ON public.user_error_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Admins can view all error logs
CREATE POLICY "Admins can view all errors"
  ON public.user_error_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Admins can update error logs
CREATE POLICY "Admins can update errors"
  ON public.user_error_logs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Phase 3: Create user activity logs table
CREATE TABLE IF NOT EXISTS public.user_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT,
  
  -- Activity classification
  activity_type TEXT NOT NULL,
  activity_name TEXT NOT NULL,
  
  -- Location
  route_name TEXT,
  route_path TEXT,
  
  -- Details
  description TEXT,
  metadata JSONB,
  
  -- Performance
  duration_ms INTEGER,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for user_activity_logs
CREATE INDEX idx_user_activity_logs_user_id ON public.user_activity_logs(user_id);
CREATE INDEX idx_user_activity_logs_created_at ON public.user_activity_logs(created_at DESC);
CREATE INDEX idx_user_activity_logs_activity_type ON public.user_activity_logs(activity_type);

-- Enable RLS on user_activity_logs
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own activity logs
CREATE POLICY "Users can view own activities"
  ON public.user_activity_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Admins can view all activity logs
CREATE POLICY "Admins can view all activities"
  ON public.user_activity_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Phase 3: Create user log summaries table
CREATE TABLE IF NOT EXISTS public.user_log_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Time period
  period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Summary statistics
  total_errors INTEGER DEFAULT 0,
  critical_errors INTEGER DEFAULT 0,
  high_severity_errors INTEGER DEFAULT 0,
  total_activities INTEGER DEFAULT 0,
  
  -- Top errors
  top_errors JSONB,
  
  -- User health score (0-100)
  health_score INTEGER CHECK (health_score >= 0 AND health_score <= 100),
  
  -- AI-friendly summaries
  summary_text TEXT,
  technical_summary TEXT,
  
  -- Full data export
  full_log_data JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, period_type, period_start, period_end)
);

-- Create indexes for user_log_summaries
CREATE INDEX idx_user_log_summaries_user_id ON public.user_log_summaries(user_id);
CREATE INDEX idx_user_log_summaries_period ON public.user_log_summaries(period_start DESC, period_end DESC);

-- Enable RLS on user_log_summaries
ALTER TABLE public.user_log_summaries ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own summaries
CREATE POLICY "Users can view own summaries"
  ON public.user_log_summaries FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Admins can view all summaries
CREATE POLICY "Admins can view all summaries"
  ON public.user_log_summaries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Phase 4: Add admin notification settings to app_settings
INSERT INTO public.app_settings (setting_key, setting_value)
VALUES (
  'admin_notifications',
  jsonb_build_object(
    'enabled', true,
    'admin_email', 'poliparitosh@gmail.com',
    'error_alerts', jsonb_build_object(
      'enabled', true,
      'min_severity', 'high',
      'cooldown_minutes', 30,
      'include_stack_traces', true,
      'include_component_info', true
    ),
    'user_registration', jsonb_build_object(
      'enabled', true,
      'send_immediately', true,
      'include_user_details', true
    ),
    'daily_summary', jsonb_build_object(
      'enabled', true,
      'send_time', '08:00',
      'include_error_count', true,
      'include_new_users', true,
      'include_top_issues', true,
      'max_issues_to_show', 10
    )
  )
)
ON CONFLICT (setting_key) 
DO UPDATE SET setting_value = EXCLUDED.setting_value;