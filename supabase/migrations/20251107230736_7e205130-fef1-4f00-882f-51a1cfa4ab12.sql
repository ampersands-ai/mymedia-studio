-- Create webhook alert history table
CREATE TABLE IF NOT EXISTS public.webhook_alert_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  trigger_value NUMERIC NOT NULL,
  threshold_value NUMERIC NOT NULL,
  message TEXT NOT NULL,
  channels_sent JSONB NOT NULL DEFAULT '[]'::jsonb,
  channels_failed JSONB NOT NULL DEFAULT '[]'::jsonb,
  recipients TEXT[],
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.webhook_alert_history ENABLE ROW LEVEL SECURITY;

-- Admins can view all alert history
CREATE POLICY "Admins can view alert history"
  ON public.webhook_alert_history
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update alert history (for marking resolved)
CREATE POLICY "Admins can update alert history"
  ON public.webhook_alert_history
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role can insert alert history
CREATE POLICY "Service role can insert alert history"
  ON public.webhook_alert_history
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Create indexes for efficient querying
CREATE INDEX idx_webhook_alert_history_created_at ON public.webhook_alert_history(created_at DESC);
CREATE INDEX idx_webhook_alert_history_alert_type ON public.webhook_alert_history(alert_type);
CREATE INDEX idx_webhook_alert_history_severity ON public.webhook_alert_history(severity);
CREATE INDEX idx_webhook_alert_history_is_resolved ON public.webhook_alert_history(is_resolved);