-- Fix duplicate token bonus issue
-- Remove the duplicate check_profile_completion_bonus trigger
DROP TRIGGER IF EXISTS on_profile_completed ON public.profiles;
DROP FUNCTION IF EXISTS public.check_profile_completion_bonus();

-- Update handle_email_verified to prevent double-awarding
CREATE OR REPLACE FUNCTION public.handle_email_verified()
RETURNS TRIGGER AS $$
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
    
    -- Check if bonus was already given (tokens_total > 500 means bonus received)
    SELECT tokens_total > 500 INTO bonus_already_given
    FROM public.user_subscriptions
    WHERE user_id = NEW.id;
    
    -- Award bonus ONLY if conditions met AND not already given
    IF user_profile.phone_number IS NOT NULL 
       AND user_profile.phone_number != ''
       AND user_profile.zipcode IS NOT NULL 
       AND user_profile.zipcode != ''
       AND NOT bonus_already_given THEN
      
      UPDATE public.user_subscriptions
      SET 
        tokens_remaining = tokens_remaining + 100,
        tokens_total = tokens_total + 100
      WHERE user_id = NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Manually correct the test user's token balance
UPDATE public.user_subscriptions 
SET 
  tokens_remaining = 600,
  tokens_total = 600
WHERE user_id = '4131c5ee-ea66-43b9-88cb-8cf979725096';