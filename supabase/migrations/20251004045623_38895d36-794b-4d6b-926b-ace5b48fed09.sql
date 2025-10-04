-- Update the profile completion bonus function to not require country field
CREATE OR REPLACE FUNCTION public.check_profile_completion_bonus()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_email_verified BOOLEAN;
  bonus_already_given BOOLEAN;
BEGIN
  -- Check if all optional fields are now filled (removed country requirement)
  IF NEW.phone_number IS NOT NULL 
     AND NEW.phone_number != ''
     AND NEW.zipcode IS NOT NULL 
     AND NEW.zipcode != ''
     AND NEW.email_verified = TRUE THEN
    
    -- Check if bonus was already given (tokens_total > 500)
    SELECT tokens_total > 500 INTO bonus_already_given
    FROM public.user_subscriptions
    WHERE user_id = NEW.id;
    
    -- Give bonus only if not already given
    IF NOT bonus_already_given THEN
      UPDATE public.user_subscriptions
      SET 
        tokens_remaining = tokens_remaining + 100,
        tokens_total = tokens_total + 100
      WHERE user_id = NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update the email verification reward function
CREATE OR REPLACE FUNCTION public.handle_email_verified()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_profile RECORD;
BEGIN
  -- Check if email was just verified
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    -- Get user profile to check if all optional fields are filled
    SELECT phone_number, zipcode, email_verified
    INTO user_profile
    FROM public.profiles
    WHERE id = NEW.id;
    
    -- Update profile to mark email as verified
    UPDATE public.profiles
    SET email_verified = TRUE
    WHERE id = NEW.id;
    
    -- Add 100 bonus tokens ONLY if email is verified AND all optional fields are provided
    IF user_profile.phone_number IS NOT NULL 
       AND user_profile.phone_number != ''
       AND user_profile.zipcode IS NOT NULL 
       AND user_profile.zipcode != '' THEN
      
      UPDATE public.user_subscriptions
      SET 
        tokens_remaining = tokens_remaining + 100,
        tokens_total = tokens_total + 100
      WHERE user_id = NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;