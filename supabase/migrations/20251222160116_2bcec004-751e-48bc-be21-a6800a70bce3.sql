-- Signup Attribution Table for UTM and Referral Tracking
-- Privacy-first: No IP addresses stored, only acquisition channel data

CREATE TABLE public.signup_attribution (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- UTM Parameters (standard marketing attribution)
  utm_source VARCHAR(100),      -- e.g., google, facebook, newsletter
  utm_medium VARCHAR(100),      -- e.g., cpc, email, social
  utm_campaign VARCHAR(200),    -- e.g., summer_sale, launch_2024
  utm_term VARCHAR(200),        -- keyword for paid search
  utm_content VARCHAR(200),     -- differentiates ad variations
  
  -- Referral tracking
  referral_code VARCHAR(50),    -- if referred by another user
  referrer_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Landing page context (no PII)
  landing_page VARCHAR(500),    -- e.g., /pricing, /features
  signup_method VARCHAR(20) NOT NULL DEFAULT 'email', -- email, google, apple
  
  -- Device context (anonymized)
  device_type VARCHAR(20),      -- mobile, tablet, desktop
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.signup_attribution ENABLE ROW LEVEL SECURITY;

-- Users can view their own attribution (for transparency)
CREATE POLICY "Users can view own attribution"
  ON public.signup_attribution
  FOR SELECT
  USING (auth.uid() = user_id);

-- Only system/edge functions can insert (via service role)
-- No direct client inserts allowed

-- Admins can view all for analytics
CREATE POLICY "Admins can view all attribution"
  ON public.signup_attribution
  FOR SELECT
  USING (public.is_admin_user(auth.uid()));

-- Index for analytics queries
CREATE INDEX idx_signup_attribution_created_at ON public.signup_attribution(created_at);
CREATE INDEX idx_signup_attribution_source ON public.signup_attribution(utm_source) WHERE utm_source IS NOT NULL;
CREATE INDEX idx_signup_attribution_referral ON public.signup_attribution(referral_code) WHERE referral_code IS NOT NULL;

-- Comment for documentation
COMMENT ON TABLE public.signup_attribution IS 'Tracks acquisition channel data for investor metrics. Privacy-first: no IP addresses or PII stored.';