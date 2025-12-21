-- Add email preference columns to user_notification_preferences table
ALTER TABLE public.user_notification_preferences 
ADD COLUMN IF NOT EXISTS email_on_subscription_change BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS email_on_profile_created BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS email_marketing BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS unsubscribe_token UUID DEFAULT gen_random_uuid();

-- Create unique index on unsubscribe_token for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_prefs_unsubscribe_token 
ON public.user_notification_preferences(unsubscribe_token) 
WHERE unsubscribe_token IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.user_notification_preferences.email_on_subscription_change IS 'Whether to send emails for subscription changes (activated, upgraded, downgraded, cancelled)';
COMMENT ON COLUMN public.user_notification_preferences.email_on_profile_created IS 'Whether to send welcome email when profile is created';
COMMENT ON COLUMN public.user_notification_preferences.email_marketing IS 'Whether to send marketing and product update emails';
COMMENT ON COLUMN public.user_notification_preferences.unsubscribe_token IS 'Unique token for one-click unsubscribe links';