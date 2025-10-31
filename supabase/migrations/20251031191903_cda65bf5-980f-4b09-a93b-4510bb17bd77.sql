-- Update increment_tokens function to support decimal credits
CREATE OR REPLACE FUNCTION public.increment_tokens(user_id_param uuid, amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Validate amount is within reasonable bounds (-100,000 to +100,000)
  IF amount > 100000 OR amount < -100000 THEN
    RAISE EXCEPTION 'Invalid credit amount: % exceeds limits', amount;
  END IF;
  
  -- Check user subscription exists
  IF NOT EXISTS (SELECT 1 FROM public.user_subscriptions WHERE user_id = user_id_param) THEN
    RAISE EXCEPTION 'User subscription not found';
  END IF;
  
  -- Update tokens_remaining (supports decimals now)
  UPDATE public.user_subscriptions
  SET tokens_remaining = GREATEST(0, tokens_remaining + amount)
  WHERE user_id = user_id_param;
  
  -- Audit log for significant changes (>= 10 credits instead of 100)
  IF ABS(amount) >= 10 THEN
    INSERT INTO public.audit_logs (user_id, action, metadata)
    VALUES (user_id_param, 'credits_modified', jsonb_build_object('amount', amount, 'source', 'increment_tokens'));
  END IF;
END;
$function$;