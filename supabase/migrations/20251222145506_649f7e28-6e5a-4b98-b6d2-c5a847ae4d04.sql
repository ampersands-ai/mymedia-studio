-- Create admin_realtime_alerts table for real-time admin notifications
CREATE TABLE public.admin_realtime_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  user_id UUID,
  metadata JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_realtime_alerts ENABLE ROW LEVEL SECURITY;

-- Only admins can view and manage alerts
CREATE POLICY "Admins can view all alerts"
ON public.admin_realtime_alerts FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update alerts"
ON public.admin_realtime_alerts FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert alerts"
ON public.admin_realtime_alerts FOR INSERT
WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_realtime_alerts;

-- Create function to check for repeat moderation offenders
CREATE OR REPLACE FUNCTION public.check_moderation_repeat_offender()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  block_count INT;
  user_email TEXT;
BEGIN
  -- Only check flagged entries
  IF NEW.flagged = true THEN
    -- Count blocks in last 24 hours for this user
    SELECT COUNT(*) INTO block_count
    FROM moderation_logs
    WHERE user_id = NEW.user_id 
      AND flagged = true 
      AND created_at > NOW() - INTERVAL '24 hours';
    
    -- If 3+ blocks, create admin alert
    IF block_count >= 3 THEN
      SELECT email INTO user_email FROM profiles WHERE id = NEW.user_id;
      
      INSERT INTO admin_realtime_alerts (alert_type, severity, title, message, user_id, metadata)
      VALUES (
        'moderation_repeat_offender',
        CASE WHEN block_count >= 5 THEN 'critical' ELSE 'warning' END,
        'Repeat Moderation Offender',
        format('User %s has %s moderation blocks in the last 24 hours', COALESCE(user_email, 'Unknown'), block_count),
        NEW.user_id,
        jsonb_build_object('block_count', block_count, 'latest_categories', NEW.flagged_categories)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for repeat offender detection
CREATE TRIGGER trigger_check_moderation_offender
AFTER INSERT ON moderation_logs
FOR EACH ROW EXECUTE FUNCTION check_moderation_repeat_offender();

-- Create function to notify on new user signups
CREATE OR REPLACE FUNCTION public.notify_new_user_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO admin_realtime_alerts (alert_type, severity, title, message, user_id, metadata)
  VALUES (
    'new_user',
    'info',
    'New User Signup',
    format('New user registered: %s', COALESCE(NEW.email, 'No email')),
    NEW.id,
    jsonb_build_object('email', NEW.email, 'full_name', NEW.full_name)
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup alerts
CREATE TRIGGER trigger_new_user_alert
AFTER INSERT ON profiles
FOR EACH ROW EXECUTE FUNCTION notify_new_user_signup();

-- Add index for performance
CREATE INDEX idx_admin_alerts_created_at ON admin_realtime_alerts(created_at DESC);
CREATE INDEX idx_admin_alerts_is_read ON admin_realtime_alerts(is_read) WHERE is_read = false;