-- Update handle_new_user function to also create onboarding progress record
-- This ensures all new users automatically get an onboarding progress entry

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  alert_settings JSONB;
  function_url TEXT;
BEGIN
  -- Create user profile
  INSERT INTO public.profiles (
    id, 
    email, 
    full_name,
    phone_number,
    country,
    zipcode,
    email_verified
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone_number',
    NEW.raw_user_meta_data->>'country',
    NEW.raw_user_meta_data->>'zipcode',
    FALSE
  );
  
  -- Create user subscription (5 credits for new users)
  INSERT INTO public.user_subscriptions (user_id, plan, tokens_remaining, tokens_total)
  VALUES (NEW.id, 'freemium', 5, 5);
  
  -- Create onboarding progress record (FIX for 406 error)
  INSERT INTO public.user_onboarding_progress (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Check if admin notifications are enabled
  SELECT setting_value INTO alert_settings
  FROM public.app_settings
  WHERE setting_key = 'admin_notifications';
  
  -- Send new user alert if enabled
  IF alert_settings IS NOT NULL 
     AND (alert_settings->>'enabled')::boolean = true 
     AND (alert_settings->'user_registration'->>'enabled')::boolean = true THEN
    
    -- Build function URL
    function_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-new-user-alert';
    
    -- Trigger email notification via edge function
    PERFORM net.http_post(
      url := function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key', true)
      ),
      body := jsonb_build_object(
        'user_id', NEW.id,
        'email', NEW.email,
        'full_name', COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        'phone_number', COALESCE(NEW.raw_user_meta_data->>'phone_number', ''),
        'country', COALESCE(NEW.raw_user_meta_data->>'country', ''),
        'zipcode', COALESCE(NEW.raw_user_meta_data->>'zipcode', ''),
        'signup_method', COALESCE(NEW.raw_user_meta_data->>'provider', 'email'),
        'created_at', NEW.created_at::text
      )
    );
  END IF;
  
  RETURN NEW;
END;
$function$;