-- Fix 1: Add DELETE policy for community_creations
CREATE POLICY "Users can delete own shares"
ON public.community_creations
FOR DELETE
USING (auth.uid() = user_id);

-- Fix 2: Add storage.objects RLS policies for generated-content bucket
CREATE POLICY "Users can access own generated content"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'generated-content' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Service role can insert generated content"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'generated-content');

CREATE POLICY "Service role can update generated content"
ON storage.objects FOR UPDATE
USING (bucket_id = 'generated-content')
WITH CHECK (bucket_id = 'generated-content');

CREATE POLICY "Service role can delete generated content"
ON storage.objects FOR DELETE
USING (bucket_id = 'generated-content');

-- Fix 3: Harden increment_tokens function with validation
CREATE OR REPLACE FUNCTION public.increment_tokens(user_id_param uuid, amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Validate amount isn't excessive (prevent abuse)
  IF amount > 100000 OR amount < -100000 THEN
    RAISE EXCEPTION 'Invalid token amount: % exceeds limits', amount;
  END IF;
  
  -- Validate user exists
  IF NOT EXISTS (SELECT 1 FROM public.user_subscriptions WHERE user_id = user_id_param) THEN
    RAISE EXCEPTION 'User subscription not found';
  END IF;
  
  -- Update tokens
  UPDATE public.user_subscriptions
  SET tokens_remaining = GREATEST(0, tokens_remaining + amount)
  WHERE user_id = user_id_param;
  
  -- Audit the change (only for significant amounts)
  IF ABS(amount) >= 100 THEN
    INSERT INTO public.audit_logs (user_id, action, metadata)
    VALUES (user_id_param, 'tokens_modified', jsonb_build_object('amount', amount, 'source', 'increment_tokens'));
  END IF;
END;
$function$;