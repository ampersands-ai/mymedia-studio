-- Phase 1: Email History Table
CREATE TABLE IF NOT EXISTS public.email_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  email_type TEXT NOT NULL CHECK (email_type IN ('generation_complete', 'daily_summary', 'error_alert', 'user_registration', 'welcome', 'model_alert', 'test', 'generation_timeout', 'webhook_alert', 'session_expiring')),
  subject TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  delivery_status TEXT NOT NULL DEFAULT 'sent' CHECK (delivery_status IN ('sent', 'delivered', 'bounced', 'failed', 'complained')),
  resend_email_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Phase 2: User Notification Preferences
CREATE TABLE IF NOT EXISTS public.user_notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email_on_completion BOOLEAN NOT NULL DEFAULT false,
  push_on_completion BOOLEAN NOT NULL DEFAULT false,
  notification_threshold_seconds INTEGER NOT NULL DEFAULT 60,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Phase 3: Generation Notifications
CREATE TABLE IF NOT EXISTS public.generation_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  generation_id UUID NOT NULL REFERENCES public.generations(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('email', 'push', 'in-app')),
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  delivery_status TEXT NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'failed', 'bounced')),
  error_message TEXT,
  email_id TEXT,
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Phase 4: Add keep_logged_in to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS keep_logged_in BOOLEAN DEFAULT false;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_history_user_id ON public.email_history(user_id);
CREATE INDEX IF NOT EXISTS idx_email_history_email_type ON public.email_history(email_type);
CREATE INDEX IF NOT EXISTS idx_email_history_sent_at ON public.email_history(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_generation_notifications_user_id ON public.generation_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_generation_notifications_generation_id ON public.generation_notifications(generation_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_activity_type ON public.user_activity_logs(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_created_at ON public.user_activity_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.email_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generation_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_history
CREATE POLICY "Admins can view all email history"
  ON public.email_history FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own email history"
  ON public.email_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert email history"
  ON public.email_history FOR INSERT
  WITH CHECK (true);

-- RLS Policies for user_notification_preferences
CREATE POLICY "Users can view own notification preferences"
  ON public.user_notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification preferences"
  ON public.user_notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification preferences"
  ON public.user_notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for generation_notifications
CREATE POLICY "Users can view own generation notifications"
  ON public.generation_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all generation notifications"
  ON public.generation_notifications FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can insert generation notifications"
  ON public.generation_notifications FOR INSERT
  WITH CHECK (true);

-- Trigger for updated_at on user_notification_preferences
CREATE TRIGGER update_user_notification_preferences_updated_at
  BEFORE UPDATE ON public.user_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Enable realtime for generation_notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.generation_notifications;