-- Fix 1: Add search_path to all SECURITY DEFINER functions
-- This prevents schema injection attacks

-- Update has_role function (already has it, but ensuring it's explicit)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- Update cleanup_rate_limits function
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.rate_limits
  WHERE last_attempt_at < NOW() - INTERVAL '24 hours'
    AND (blocked_until IS NULL OR blocked_until < NOW());
END;
$$;

-- Update cleanup_expired_sessions function
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.user_sessions
  WHERE expires_at < NOW() OR is_active = false;
END;
$$;

-- Update sanitize_provider_data function
CREATE OR REPLACE FUNCTION public.sanitize_provider_data(data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  data := data - 'api_key' - 'authorization' - 'token' - 'secret' - 'apiKey' - 'Authorization' - 'Bearer';
  
  IF data ? 'headers' THEN
    data := jsonb_set(data, '{headers}', (data->'headers') - 'authorization' - 'Authorization' - 'api_key');
  END IF;
  
  RETURN data;
END;
$$;

-- Update increment_tokens function
CREATE OR REPLACE FUNCTION public.increment_tokens(user_id_param uuid, amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF amount > 100000 OR amount < -100000 THEN
    RAISE EXCEPTION 'Invalid token amount: % exceeds limits', amount;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM public.user_subscriptions WHERE user_id = user_id_param) THEN
    RAISE EXCEPTION 'User subscription not found';
  END IF;
  
  UPDATE public.user_subscriptions
  SET tokens_remaining = GREATEST(0, tokens_remaining + amount)
  WHERE user_id = user_id_param;
  
  IF ABS(amount) >= 100 THEN
    INSERT INTO public.audit_logs (user_id, action, metadata)
    VALUES (user_id_param, 'tokens_modified', jsonb_build_object('amount', amount, 'source', 'increment_tokens'));
  END IF;
END;
$$;

-- Update update_updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Update handle_new_user function
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
  
  INSERT INTO public.user_subscriptions (user_id, plan, tokens_remaining, tokens_total)
  VALUES (NEW.id, 'freemium', 500, 500);
  
  INSERT INTO public.user_onboarding_progress (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$;

-- Update award_onboarding_bonus function
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
    
    UPDATE public.user_subscriptions
    SET 
      tokens_remaining = tokens_remaining + 100,
      tokens_total = tokens_total + 100
    WHERE user_id = NEW.user_id;
    
    NEW.bonus_awarded = TRUE;
    NEW.completed_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update check_profile_completion_bonus function
CREATE OR REPLACE FUNCTION public.check_profile_completion_bonus()
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
    
    SELECT tokens_total > 500 INTO bonus_already_given
    FROM public.user_subscriptions
    WHERE user_id = NEW.id;
    
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

-- Update handle_email_verified function
CREATE OR REPLACE FUNCTION public.handle_email_verified()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_profile RECORD;
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    SELECT phone_number, zipcode, email_verified
    INTO user_profile
    FROM public.profiles
    WHERE id = NEW.id;
    
    UPDATE public.profiles
    SET email_verified = TRUE
    WHERE id = NEW.id;
    
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

-- Update archive_resolved_dispute function
CREATE OR REPLACE FUNCTION public.archive_resolved_dispute()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('resolved', 'rejected') AND 
     (OLD.status IS NULL OR OLD.status NOT IN ('resolved', 'rejected')) THEN
    
    INSERT INTO public.token_dispute_history (
      dispute_id,
      generation_id,
      user_id,
      reason,
      status,
      created_at,
      reviewed_at,
      reviewed_by,
      admin_notes,
      auto_resolved,
      refund_amount,
      generation_snapshot,
      profile_snapshot
    )
    SELECT 
      NEW.id,
      NEW.generation_id,
      NEW.user_id,
      NEW.reason,
      NEW.status,
      NEW.created_at,
      NEW.reviewed_at,
      NEW.reviewed_by,
      NEW.admin_notes,
      NEW.auto_resolved,
      NEW.refund_amount,
      to_jsonb(g.*),
      to_jsonb(p.*)
    FROM public.generations g
    LEFT JOIN public.profiles p ON p.id = NEW.user_id
    WHERE g.id = NEW.generation_id;
    
    DELETE FROM public.token_dispute_reports WHERE id = NEW.id;
    
    RETURN NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Fix 2: Add storage bucket file size and MIME type restrictions
UPDATE storage.buckets
SET 
  file_size_limit = 52428800,  -- 50MB limit
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'audio/mpeg',
    'audio/wav',
    'audio/mp3'
  ]
WHERE id = 'generated-content';

-- Fix 3: Create webhook events table for idempotency tracking
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key text NOT NULL UNIQUE,
  event_type text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on webhook_events
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- Only service role can access webhook events
CREATE POLICY "Service role only access" 
ON public.webhook_events 
FOR ALL 
USING (false);

-- Create index for fast lookup
CREATE INDEX IF NOT EXISTS idx_webhook_events_idempotency 
ON public.webhook_events(idempotency_key);

-- Create index for cleanup
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at 
ON public.webhook_events(created_at);

-- Add cleanup function for old webhook events (keep 30 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_webhook_events()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.webhook_events
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$;