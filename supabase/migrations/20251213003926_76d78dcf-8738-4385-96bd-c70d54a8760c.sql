-- Fix: Remove credit awarding from check_profile_completion and handle_email_verified
-- Credits should only be awarded via:
-- 1. handle_new_user: 5 initial credits (already correct)
-- 2. award_onboarding_bonus: 2 bonus credits when checklist is 100% complete (trigger on user_onboarding_progress)

-- Step 1: Update check_profile_completion to NOT award credits
-- This function was awarding 2 credits when phone+zipcode+email_verified were all set
-- That's now handled by the onboarding checklist bonus instead
CREATE OR REPLACE FUNCTION public.check_profile_completion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- DEPRECATED: Credits are now only awarded via onboarding checklist completion
  -- This function no longer awards credits to avoid double-awarding
  -- Profile completion is tracked via the onboarding checklist instead
  RETURN NEW;
END;
$function$;

-- Step 2: Update handle_email_verified to NOT award credits
-- This function should only mark email_verified in profile, no credit awarding
CREATE OR REPLACE FUNCTION public.handle_email_verified()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    -- Only mark email as verified, do NOT award credits
    -- Credits are awarded via onboarding checklist completion only
    UPDATE public.profiles
    SET email_verified = TRUE
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Step 3: Ensure award_onboarding_bonus has a guard against double-awarding
-- The existing function already checks bonus_awarded = FALSE before awarding
-- But let's add an extra safety check on tokens_total
CREATE OR REPLACE FUNCTION public.award_onboarding_bonus()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_total NUMERIC;
BEGIN
  -- Only award bonus if:
  -- 1. is_complete is being set to TRUE
  -- 2. bonus_awarded is still FALSE
  -- 3. tokens_total is still at initial value (5) to prevent double-award
  IF NEW.is_complete = TRUE 
     AND NEW.bonus_awarded = FALSE 
     AND (OLD.is_complete = FALSE OR OLD.is_complete IS NULL) THEN
    
    -- Extra safety: check current tokens to prevent double-award
    SELECT tokens_total INTO current_total
    FROM public.user_subscriptions
    WHERE user_id = NEW.user_id;
    
    -- Only award if user hasn't received bonus yet (tokens_total should be 5)
    IF current_total IS NOT NULL AND current_total <= 5 THEN
      -- Award 2 bonus credits
      UPDATE public.user_subscriptions
      SET 
        tokens_remaining = tokens_remaining + 2,
        tokens_total = tokens_total + 2
      WHERE user_id = NEW.user_id;
      
      NEW.bonus_awarded = TRUE;
      NEW.completed_at = NOW();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;