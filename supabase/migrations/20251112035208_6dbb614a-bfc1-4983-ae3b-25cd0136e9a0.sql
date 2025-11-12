-- Phase 2: Fix Default Credits Bug (CRITICAL)
-- This migration ensures users only get 5 credits on signup, not 7

-- 1. Update handle_new_user to ONLY give 5 credits
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
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
  
  -- CRITICAL: New users now get EXACTLY 5 credits (not 7)
  INSERT INTO public.user_subscriptions (user_id, plan, tokens_remaining, tokens_total)
  VALUES (NEW.id, 'freemium', 5, 5);
  
  INSERT INTO public.user_onboarding_progress (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$function$;

-- 2. Update check_profile_completion to only award bonus if email is verified AND fields filled
CREATE OR REPLACE FUNCTION public.check_profile_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  bonus_already_given BOOLEAN;
BEGIN
  -- Only award bonus if ALL conditions met
  IF NEW.phone_number IS NOT NULL 
     AND NEW.phone_number != ''
     AND NEW.zipcode IS NOT NULL 
     AND NEW.zipcode != ''
     AND NEW.email_verified = TRUE THEN
    
    -- Check if bonus was already given (tokens_total > 5 means bonus received)
    SELECT tokens_total > 5 INTO bonus_already_given
    FROM public.user_subscriptions
    WHERE user_id = NEW.id;
    
    -- Only award if not already given
    IF NOT bonus_already_given THEN
      UPDATE public.user_subscriptions
      SET 
        tokens_remaining = tokens_remaining + 2,
        tokens_total = tokens_total + 2
      WHERE user_id = NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 3. Update handle_email_verified to be more careful about bonus awarding
CREATE OR REPLACE FUNCTION public.handle_email_verified()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_profile RECORD;
  bonus_already_given BOOLEAN;
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    -- Get profile data
    SELECT phone_number, zipcode, email_verified
    INTO user_profile
    FROM public.profiles
    WHERE id = NEW.id;
    
    -- Mark email as verified
    UPDATE public.profiles
    SET email_verified = TRUE
    WHERE id = NEW.id;
    
    -- Check if bonus was already given (tokens_total > 5 means bonus received)
    SELECT tokens_total > 5 INTO bonus_already_given
    FROM public.user_subscriptions
    WHERE user_id = NEW.id;
    
    -- Award 2 bonus credits ONLY if:
    -- 1. Profile is complete (phone + zipcode filled)
    -- 2. Bonus not already given
    IF user_profile.phone_number IS NOT NULL 
       AND user_profile.phone_number != ''
       AND user_profile.zipcode IS NOT NULL 
       AND user_profile.zipcode != ''
       AND NOT bonus_already_given THEN
      
      UPDATE public.user_subscriptions
      SET 
        tokens_remaining = tokens_remaining + 2,
        tokens_total = tokens_total + 2
      WHERE user_id = NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;