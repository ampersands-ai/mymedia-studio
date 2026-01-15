-- Create table to track sent subscription reminders (prevents duplicates)
CREATE TABLE IF NOT EXISTS public.subscription_reminder_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  reminder_type TEXT NOT NULL, -- 'renewal_3d', 'grace_7d', 'grace_48h', 'low_credits'
  sent_at TIMESTAMPTZ DEFAULT now(),
  billing_period_key TEXT NOT NULL, -- Unique key for the billing period/event
  UNIQUE(user_id, reminder_type, billing_period_key)
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_subscription_reminder_logs_user 
ON public.subscription_reminder_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_subscription_reminder_logs_type 
ON public.subscription_reminder_logs(reminder_type);

CREATE INDEX IF NOT EXISTS idx_subscription_reminder_logs_sent_at 
ON public.subscription_reminder_logs(sent_at);

-- Enable RLS - only service role should access this table
ALTER TABLE public.subscription_reminder_logs ENABLE ROW LEVEL SECURITY;

-- No public policies - only service role can access
-- This ensures reminders are only managed by the backend

-- Add comments for documentation
COMMENT ON TABLE public.subscription_reminder_logs IS 'Tracks sent subscription reminder emails to prevent duplicate sends';
COMMENT ON COLUMN public.subscription_reminder_logs.reminder_type IS 'Type of reminder: renewal_3d, grace_7d, grace_48h, low_credits';
COMMENT ON COLUMN public.subscription_reminder_logs.billing_period_key IS 'Unique identifier for the billing period or event this reminder relates to';

-- Clean up old reminder logs (older than 90 days) - can be run periodically
CREATE OR REPLACE FUNCTION public.cleanup_old_reminder_logs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.subscription_reminder_logs
  WHERE sent_at < NOW() - INTERVAL '90 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;