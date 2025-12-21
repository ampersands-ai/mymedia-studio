-- Create trigger to auto-create notification preferences for new users
CREATE OR REPLACE FUNCTION public.create_default_notification_preferences()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Create default notification preferences for the new user
  INSERT INTO public.user_notification_preferences (
    user_id,
    email_on_completion,
    notification_threshold_seconds,
    email_on_subscription_change
  )
  VALUES (
    NEW.id,
    true,  -- Enable email on completion by default
    180,   -- 3 minute threshold (only notify for long generations)
    true   -- Enable subscription change emails by default
  )
  ON CONFLICT (user_id) DO NOTHING;  -- Skip if already exists
  
  RETURN NEW;
END;
$$;

-- Create trigger on profiles table (runs after profile is created)
DROP TRIGGER IF EXISTS on_profile_created_notification_prefs ON public.profiles;
CREATE TRIGGER on_profile_created_notification_prefs
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_notification_preferences();

-- Backfill: Create notification preferences for existing users who don't have them
INSERT INTO public.user_notification_preferences (
  user_id,
  email_on_completion,
  notification_threshold_seconds,
  email_on_subscription_change
)
SELECT 
  p.id,
  true,
  180,
  true
FROM public.profiles p
LEFT JOIN public.user_notification_preferences unp ON p.id = unp.user_id
WHERE unp.user_id IS NULL;