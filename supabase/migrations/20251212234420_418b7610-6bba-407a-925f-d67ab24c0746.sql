-- Migration: Refactor handle_new_user trigger for production stability
-- Follows: Single Responsibility, Fail-Safe Design, Proper Error Boundaries

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  alert_settings JSONB;
  function_url TEXT;
  service_role_key TEXT;
BEGIN
  -- ========================================
  -- CRITICAL PATH: Core User Setup
  -- These operations MUST succeed for registration to complete
  -- ========================================
  
  -- Step 1: Create user profile
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
  
  -- Step 2: Create user subscription (5 free credits)
  INSERT INTO public.user_subscriptions (user_id, plan, tokens_remaining, tokens_total)
  VALUES (NEW.id, 'freemium', 5, 5);
  
  -- Step 3: Create onboarding progress record
  INSERT INTO public.user_onboarding_progress (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- ========================================
  -- OPTIONAL PATH: Admin Notifications
  -- Failures here should NOT prevent user registration
  -- ========================================
  BEGIN
    -- Get notification settings
    SELECT setting_value INTO alert_settings
    FROM public.app_settings
    WHERE setting_key = 'admin_notifications';
    
    -- Only proceed if notifications are enabled
    IF alert_settings IS NOT NULL 
       AND (alert_settings->>'enabled')::boolean = true 
       AND (alert_settings->'user_registration'->>'enabled')::boolean = true THEN
      
      -- Use hardcoded Supabase URL (not a secret, safe to hardcode)
      function_url := 'https://gzlwkvmivbfcvczoqphq.supabase.co/functions/v1/send-new-user-alert';
      
      -- Get service role key from Vault
      SELECT decrypted_secret INTO service_role_key
      FROM vault.decrypted_secrets
      WHERE name = 'supabase_service_role_key'
      LIMIT 1;
      
      -- Only attempt HTTP call if we have the service role key
      IF service_role_key IS NOT NULL AND service_role_key != '' THEN
        PERFORM net.http_post(
          url := function_url,
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || service_role_key
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
    END IF;
    
  EXCEPTION WHEN OTHERS THEN
    -- Log the error but DO NOT fail the transaction
    -- This ensures user registration succeeds even if notification fails
    RAISE WARNING '[handle_new_user] Admin notification failed for user %: % (SQLSTATE: %)', 
      NEW.email, SQLERRM, SQLSTATE;
  END;
  
  -- Registration complete - return the new user
  RETURN NEW;
END;
$function$;