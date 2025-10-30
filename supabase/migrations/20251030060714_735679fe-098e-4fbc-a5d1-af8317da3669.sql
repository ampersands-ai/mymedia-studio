-- Update default credit values for new users (100:1 conversion from tokens to credits)
-- This migration changes defaults from 500 tokens to 5 credits and 100 bonus to 2 bonus credits

-- Update column defaults for user_subscriptions table
ALTER TABLE public.user_subscriptions 
  ALTER COLUMN tokens_remaining SET DEFAULT 5,
  ALTER COLUMN tokens_total SET DEFAULT 5;

-- Update the handle_new_user function to use new credit values
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  
  -- New users now get 5 credits instead of 500
  INSERT INTO public.user_subscriptions (user_id, plan, tokens_remaining, tokens_total)
  VALUES (NEW.id, 'freemium', 5, 5);
  
  INSERT INTO public.user_onboarding_progress (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$;

-- Update award_onboarding_bonus function to use 2 credits instead of 100
CREATE OR REPLACE FUNCTION public.award_onboarding_bonus()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_complete = TRUE 
     AND NEW.bonus_awarded = FALSE 
     AND (OLD.is_complete = FALSE OR OLD.is_complete IS NULL) THEN
    
    -- Award 2 bonus credits instead of 100
    UPDATE public.user_subscriptions
    SET 
      tokens_remaining = tokens_remaining + 2,
      tokens_total = tokens_total + 2
    WHERE user_id = NEW.user_id;
    
    NEW.bonus_awarded = TRUE;
    NEW.completed_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update handle_email_verified function to check for bonus already given (tokens_total > 5)
CREATE OR REPLACE FUNCTION public.handle_email_verified()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    
    -- Award 2 bonus credits if conditions met AND not already given
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
$$;

-- Update check_profile_completion trigger function to use 2 credits bonus
CREATE OR REPLACE FUNCTION public.check_profile_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email_verified BOOLEAN;
  bonus_already_given BOOLEAN;
BEGIN
  IF NEW.phone_number IS NOT NULL 
     AND NEW.phone_number != ''
     AND NEW.zipcode IS NOT NULL 
     AND NEW.zipcode != ''
     AND NEW.email_verified = TRUE THEN
    
    -- Check if bonus was already given (tokens_total > 5)
    SELECT tokens_total > 5 INTO bonus_already_given
    FROM public.user_subscriptions
    WHERE user_id = NEW.id;
    
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
$$;