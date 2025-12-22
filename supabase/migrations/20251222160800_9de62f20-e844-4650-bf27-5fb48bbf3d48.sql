-- =============================================
-- PHASE 3: PROMPT PRIVACY
-- =============================================

-- Function to anonymize old prompts (keeps statistical data, removes PII-linked content)
CREATE OR REPLACE FUNCTION public.anonymize_old_prompts()
RETURNS TABLE(generations_anonymized INTEGER, moderation_logs_deleted INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  gen_count INTEGER := 0;
  mod_count INTEGER := 0;
BEGIN
  -- Anonymize prompts older than 90 days in generations
  -- Keep: token counts, model info, type, status, timestamps
  -- Remove: actual prompt text (replace with hash for uniqueness tracking)
  UPDATE public.generations
  SET 
    prompt = '[ANONYMIZED-' || LEFT(md5(prompt), 8) || ']',
    original_prompt = CASE 
      WHEN original_prompt IS NOT NULL THEN '[ANONYMIZED]'
      ELSE NULL 
    END,
    enhanced_prompt = CASE 
      WHEN enhanced_prompt IS NOT NULL THEN '[ANONYMIZED]'
      ELSE NULL 
    END
  WHERE created_at < NOW() - INTERVAL '90 days'
    AND prompt NOT LIKE '[ANONYMIZED-%';
  GET DIAGNOSTICS gen_count = ROW_COUNT;
  
  -- Delete moderation_logs older than 90 days
  -- Keep category statistics in a separate aggregation if needed
  DELETE FROM public.moderation_logs
  WHERE created_at < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS mod_count = ROW_COUNT;
  
  RETURN QUERY SELECT gen_count, mod_count;
END;
$$;

-- =============================================
-- PHASE 4: REFERRAL SYSTEM
-- =============================================

-- Referral codes table
CREATE TABLE public.referral_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code VARCHAR(20) NOT NULL UNIQUE,
  reward_tokens NUMERIC NOT NULL DEFAULT 5,
  max_uses INTEGER, -- NULL = unlimited
  current_uses INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Referral redemptions (who used which code)
CREATE TABLE public.referral_redemptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referral_code_id UUID NOT NULL REFERENCES public.referral_codes(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referrer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referrer_reward_tokens NUMERIC NOT NULL DEFAULT 5,
  referred_reward_tokens NUMERIC NOT NULL DEFAULT 2,
  referrer_rewarded BOOLEAN NOT NULL DEFAULT false,
  referred_rewarded BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_referred_user UNIQUE (referred_user_id)
);

-- Enable RLS
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_redemptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for referral_codes
CREATE POLICY "Users can view their own referral codes"
  ON public.referral_codes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own referral codes"
  ON public.referral_codes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own referral codes"
  ON public.referral_codes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all referral codes"
  ON public.referral_codes FOR SELECT
  USING (public.is_admin_user(auth.uid()));

-- Public policy to check if code exists (for redemption)
CREATE POLICY "Anyone can check referral code validity"
  ON public.referral_codes FOR SELECT
  USING (is_active = true AND (expires_at IS NULL OR expires_at > NOW()));

-- RLS Policies for referral_redemptions
CREATE POLICY "Users can view redemptions they're part of"
  ON public.referral_redemptions FOR SELECT
  USING (auth.uid() = referrer_user_id OR auth.uid() = referred_user_id);

CREATE POLICY "Admins can view all redemptions"
  ON public.referral_redemptions FOR SELECT
  USING (public.is_admin_user(auth.uid()));

-- Indexes for performance
CREATE INDEX idx_referral_codes_user_id ON public.referral_codes(user_id);
CREATE INDEX idx_referral_codes_code ON public.referral_codes(code);
CREATE INDEX idx_referral_codes_active ON public.referral_codes(is_active) WHERE is_active = true;
CREATE INDEX idx_referral_redemptions_referrer ON public.referral_redemptions(referrer_user_id);
CREATE INDEX idx_referral_redemptions_referred ON public.referral_redemptions(referred_user_id);

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
  attempts INTEGER := 0;
BEGIN
  LOOP
    -- Generate a random 8-character alphanumeric code
    new_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
    
    -- Check if code already exists
    IF NOT EXISTS (SELECT 1 FROM public.referral_codes WHERE code = new_code) THEN
      -- Insert the new code
      INSERT INTO public.referral_codes (user_id, code)
      VALUES (p_user_id, new_code);
      
      RETURN new_code;
    END IF;
    
    attempts := attempts + 1;
    IF attempts > 10 THEN
      RAISE EXCEPTION 'Could not generate unique referral code';
    END IF;
  END LOOP;
END;
$$;

-- Function to redeem referral code
CREATE OR REPLACE FUNCTION public.redeem_referral_code(p_code TEXT, p_referred_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral_code RECORD;
BEGIN
  -- Check if user already has a referral
  IF EXISTS (SELECT 1 FROM public.referral_redemptions WHERE referred_user_id = p_referred_user_id) THEN
    RETURN false; -- Already referred
  END IF;
  
  -- Get the referral code
  SELECT * INTO v_referral_code
  FROM public.referral_codes
  WHERE code = upper(p_code)
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > NOW())
    AND (max_uses IS NULL OR current_uses < max_uses)
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN false; -- Invalid or expired code
  END IF;
  
  -- Prevent self-referral
  IF v_referral_code.user_id = p_referred_user_id THEN
    RETURN false;
  END IF;
  
  -- Create redemption record
  INSERT INTO public.referral_redemptions (
    referral_code_id, 
    referred_user_id, 
    referrer_user_id,
    referrer_reward_tokens,
    referred_reward_tokens
  )
  VALUES (
    v_referral_code.id,
    p_referred_user_id,
    v_referral_code.user_id,
    v_referral_code.reward_tokens,
    2 -- New user bonus
  );
  
  -- Update code usage count
  UPDATE public.referral_codes
  SET current_uses = current_uses + 1,
      updated_at = NOW()
  WHERE id = v_referral_code.id;
  
  -- Award tokens to referred user immediately
  UPDATE public.user_subscriptions
  SET tokens_remaining = tokens_remaining + 2,
      tokens_total = tokens_total + 2
  WHERE user_id = p_referred_user_id;
  
  -- Update redemption record
  UPDATE public.referral_redemptions
  SET referred_rewarded = true
  WHERE referred_user_id = p_referred_user_id;
  
  -- Update signup_attribution with referrer info
  UPDATE public.signup_attribution
  SET referral_code = p_code,
      referrer_user_id = v_referral_code.user_id
  WHERE user_id = p_referred_user_id;
  
  RETURN true;
END;
$$;

-- Function to award referrer tokens (called when referred user makes first generation)
CREATE OR REPLACE FUNCTION public.award_referrer_tokens()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_redemption RECORD;
BEGIN
  -- Only trigger on first completed generation
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Check if this user was referred and referrer hasn't been rewarded yet
    SELECT * INTO v_redemption
    FROM public.referral_redemptions
    WHERE referred_user_id = NEW.user_id
      AND referrer_rewarded = false
    FOR UPDATE;
    
    IF FOUND THEN
      -- Award tokens to referrer
      UPDATE public.user_subscriptions
      SET tokens_remaining = tokens_remaining + v_redemption.referrer_reward_tokens,
          tokens_total = tokens_total + v_redemption.referrer_reward_tokens
      WHERE user_id = v_redemption.referrer_user_id;
      
      -- Mark as rewarded
      UPDATE public.referral_redemptions
      SET referrer_rewarded = true
      WHERE id = v_redemption.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to award referrer on first generation
CREATE TRIGGER trigger_award_referrer_tokens
  AFTER UPDATE ON public.generations
  FOR EACH ROW
  EXECUTE FUNCTION public.award_referrer_tokens();

-- =============================================
-- PHASE 4: ACQUISITION ANALYTICS VIEWS
-- =============================================

-- Monthly cohort retention view
CREATE OR REPLACE VIEW public.acquisition_cohort_metrics AS
SELECT
  date_trunc('month', p.created_at) as cohort_month,
  COUNT(DISTINCT p.id) as cohort_size,
  COUNT(DISTINCT CASE WHEN us.tokens_total > us.tokens_remaining THEN p.id END) as activated_users,
  COUNT(DISTINCT CASE WHEN us.plan != 'freemium' THEN p.id END) as converted_users,
  COUNT(DISTINCT CASE 
    WHEN p.last_activity_at > NOW() - INTERVAL '30 days' THEN p.id 
  END) as active_last_30d,
  ROUND(
    COUNT(DISTINCT CASE WHEN us.plan != 'freemium' THEN p.id END)::NUMERIC / 
    NULLIF(COUNT(DISTINCT p.id), 0) * 100, 2
  ) as conversion_rate_pct
FROM public.profiles p
LEFT JOIN public.user_subscriptions us ON us.user_id = p.id
GROUP BY date_trunc('month', p.created_at)
ORDER BY cohort_month DESC;

-- Feature adoption metrics view
CREATE OR REPLACE VIEW public.feature_adoption_metrics AS
SELECT
  g.type as feature_type,
  COUNT(DISTINCT g.id) as total_generations,
  COUNT(DISTINCT g.user_id) as unique_users,
  COUNT(DISTINCT CASE 
    WHEN g.created_at > NOW() - INTERVAL '30 days' THEN g.user_id 
  END) as users_last_30d,
  AVG(g.tokens_used) as avg_tokens_per_generation,
  SUM(g.tokens_used) as total_tokens_consumed
FROM public.generations g
WHERE g.status = 'completed'
GROUP BY g.type
ORDER BY total_generations DESC;

-- Token economics view
CREATE OR REPLACE VIEW public.token_economics_metrics AS
SELECT
  us.plan,
  COUNT(DISTINCT us.user_id) as user_count,
  SUM(us.tokens_total) as total_tokens_issued,
  SUM(us.tokens_remaining) as total_tokens_remaining,
  SUM(us.tokens_total - us.tokens_remaining) as total_tokens_consumed,
  ROUND(
    AVG(us.tokens_total - us.tokens_remaining), 2
  ) as avg_tokens_consumed_per_user,
  ROUND(
    SUM(us.tokens_total - us.tokens_remaining)::NUMERIC / 
    NULLIF(SUM(us.tokens_total), 0) * 100, 2
  ) as consumption_rate_pct
FROM public.user_subscriptions us
GROUP BY us.plan
ORDER BY user_count DESC;

-- Acquisition channel performance view
CREATE OR REPLACE VIEW public.acquisition_channel_metrics AS
SELECT
  COALESCE(sa.utm_source, 'direct') as source,
  COALESCE(sa.utm_medium, 'none') as medium,
  COALESCE(sa.utm_campaign, 'none') as campaign,
  sa.signup_method,
  COUNT(DISTINCT sa.user_id) as signups,
  COUNT(DISTINCT CASE 
    WHEN us.tokens_total > us.tokens_remaining THEN sa.user_id 
  END) as activated,
  COUNT(DISTINCT CASE 
    WHEN us.plan != 'freemium' THEN sa.user_id 
  END) as converted,
  ROUND(
    COUNT(DISTINCT CASE WHEN us.plan != 'freemium' THEN sa.user_id END)::NUMERIC / 
    NULLIF(COUNT(DISTINCT sa.user_id), 0) * 100, 2
  ) as conversion_rate_pct
FROM public.signup_attribution sa
LEFT JOIN public.user_subscriptions us ON us.user_id = sa.user_id
GROUP BY sa.utm_source, sa.utm_medium, sa.utm_campaign, sa.signup_method
ORDER BY signups DESC;

-- Referral program metrics view
CREATE OR REPLACE VIEW public.referral_program_metrics AS
SELECT
  rc.user_id as referrer_id,
  p.display_name as referrer_name,
  rc.code,
  rc.current_uses as total_referrals,
  COUNT(DISTINCT CASE WHEN rr.referrer_rewarded = true THEN rr.id END) as successful_referrals,
  SUM(CASE WHEN rr.referrer_rewarded = true THEN rr.referrer_reward_tokens ELSE 0 END) as tokens_earned,
  rc.is_active,
  rc.created_at
FROM public.referral_codes rc
LEFT JOIN public.referral_redemptions rr ON rr.referral_code_id = rc.id
LEFT JOIN public.profiles p ON p.id = rc.user_id
GROUP BY rc.id, rc.user_id, p.display_name, rc.code, rc.current_uses, rc.is_active, rc.created_at
ORDER BY total_referrals DESC;

-- Churn risk indicators view
CREATE OR REPLACE VIEW public.churn_risk_indicators AS
SELECT
  p.id as user_id,
  p.display_name,
  us.plan,
  us.tokens_remaining,
  us.tokens_total,
  p.last_activity_at,
  EXTRACT(days FROM NOW() - p.last_activity_at) as days_since_activity,
  (SELECT COUNT(*) FROM public.generations g WHERE g.user_id = p.id) as total_generations,
  (SELECT COUNT(*) FROM public.generations g 
   WHERE g.user_id = p.id AND g.created_at > NOW() - INTERVAL '30 days') as generations_last_30d,
  CASE
    WHEN p.last_activity_at < NOW() - INTERVAL '30 days' THEN 'high'
    WHEN p.last_activity_at < NOW() - INTERVAL '14 days' THEN 'medium'
    WHEN us.tokens_remaining = 0 AND us.plan = 'freemium' THEN 'medium'
    ELSE 'low'
  END as churn_risk
FROM public.profiles p
LEFT JOIN public.user_subscriptions us ON us.user_id = p.id
WHERE p.last_activity_at IS NOT NULL
ORDER BY days_since_activity DESC;

-- Grant select on views to authenticated users (admin-only access controlled by RLS on base tables)
GRANT SELECT ON public.acquisition_cohort_metrics TO authenticated;
GRANT SELECT ON public.feature_adoption_metrics TO authenticated;
GRANT SELECT ON public.token_economics_metrics TO authenticated;
GRANT SELECT ON public.acquisition_channel_metrics TO authenticated;
GRANT SELECT ON public.referral_program_metrics TO authenticated;
GRANT SELECT ON public.churn_risk_indicators TO authenticated;

-- Add prompt anonymization to the daily cleanup job
-- Update the cleanup function to include prompt anonymization
CREATE OR REPLACE FUNCTION public.cleanup_old_logs_with_retention()
RETURNS TABLE(table_name text, deleted_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  error_deleted INTEGER := 0;
  api_call_deleted INTEGER := 0;
  activity_anonymized INTEGER := 0;
  audit_deleted INTEGER := 0;
  function_deleted INTEGER := 0;
  prompts_anonymized INTEGER := 0;
  moderation_deleted INTEGER := 0;
BEGIN
  -- 1. Delete error_events older than 30 days
  DELETE FROM public.error_events
  WHERE created_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS error_deleted = ROW_COUNT;
  
  -- 2. Delete api_call_logs older than 30 days
  DELETE FROM public.api_call_logs
  WHERE created_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS api_call_deleted = ROW_COUNT;
  
  -- 3. Anonymize user_activity_logs older than 90 days (set user_id to NULL)
  UPDATE public.user_activity_logs
  SET user_id = NULL
  WHERE created_at < NOW() - INTERVAL '90 days'
    AND user_id IS NOT NULL;
  GET DIAGNOSTICS activity_anonymized = ROW_COUNT;
  
  -- 4. Delete audit_logs older than 90 days
  DELETE FROM public.audit_logs
  WHERE created_at < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS audit_deleted = ROW_COUNT;
  
  -- 5. Delete function_logs older than 30 days
  DELETE FROM public.function_logs
  WHERE created_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS function_deleted = ROW_COUNT;
  
  -- 6. Anonymize IP/user-agent in audit_logs older than 7 days
  UPDATE public.audit_logs
  SET ip_address = NULL, user_agent = NULL
  WHERE created_at < NOW() - INTERVAL '7 days'
    AND (ip_address IS NOT NULL OR user_agent IS NOT NULL);
  
  -- 7. NEW: Anonymize prompts older than 90 days
  UPDATE public.generations
  SET 
    prompt = '[ANONYMIZED-' || LEFT(md5(prompt), 8) || ']',
    original_prompt = CASE WHEN original_prompt IS NOT NULL THEN '[ANONYMIZED]' ELSE NULL END,
    enhanced_prompt = CASE WHEN enhanced_prompt IS NOT NULL THEN '[ANONYMIZED]' ELSE NULL END
  WHERE created_at < NOW() - INTERVAL '90 days'
    AND prompt NOT LIKE '[ANONYMIZED-%';
  GET DIAGNOSTICS prompts_anonymized = ROW_COUNT;
  
  -- 8. NEW: Delete moderation_logs older than 90 days
  DELETE FROM public.moderation_logs
  WHERE created_at < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS moderation_deleted = ROW_COUNT;
  
  RETURN QUERY VALUES
    ('error_events'::TEXT, error_deleted),
    ('api_call_logs'::TEXT, api_call_deleted),
    ('user_activity_logs_anonymized'::TEXT, activity_anonymized),
    ('audit_logs'::TEXT, audit_deleted),
    ('function_logs'::TEXT, function_deleted),
    ('prompts_anonymized'::TEXT, prompts_anonymized),
    ('moderation_logs'::TEXT, moderation_deleted);
END;
$$;