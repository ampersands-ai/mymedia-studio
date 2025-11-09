-- Create alert configurations table
CREATE TABLE public.model_alert_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  model_id TEXT NOT NULL,
  threshold_percentage NUMERIC NOT NULL DEFAULT 10.0,
  time_window_minutes INTEGER NOT NULL DEFAULT 60,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  recipient_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create alert history table
CREATE TABLE public.model_alert_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_id UUID REFERENCES public.model_alert_configs(id) ON DELETE CASCADE,
  model_id TEXT NOT NULL,
  failure_rate NUMERIC NOT NULL,
  failed_count INTEGER NOT NULL,
  total_count INTEGER NOT NULL,
  time_window_start TIMESTAMP WITH TIME ZONE NOT NULL,
  time_window_end TIMESTAMP WITH TIME ZONE NOT NULL,
  email_sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.model_alert_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_alert_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for alert configs
CREATE POLICY "Users can view their own alert configs"
ON public.model_alert_configs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own alert configs"
ON public.model_alert_configs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own alert configs"
ON public.model_alert_configs FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own alert configs"
ON public.model_alert_configs FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for alert history
CREATE POLICY "Users can view their own alert history"
ON public.model_alert_history FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.model_alert_configs
    WHERE id = model_alert_history.config_id
    AND user_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_model_alert_configs_updated_at
BEFORE UPDATE ON public.model_alert_configs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Create index for faster queries
CREATE INDEX idx_model_alert_configs_user_id ON public.model_alert_configs(user_id);
CREATE INDEX idx_model_alert_history_config_id ON public.model_alert_history(config_id);
CREATE INDEX idx_model_alert_history_created_at ON public.model_alert_history(created_at);