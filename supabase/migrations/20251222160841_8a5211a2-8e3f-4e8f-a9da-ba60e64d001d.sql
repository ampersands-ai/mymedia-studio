-- Fix Security Definer Views - Change to SECURITY INVOKER
-- This ensures views respect the RLS policies of the querying user

-- Drop and recreate views with SECURITY INVOKER

DROP VIEW IF EXISTS public.acquisition_cohort_metrics;
DROP VIEW IF EXISTS public.feature_adoption_metrics;
DROP VIEW IF EXISTS public.token_economics_metrics;
DROP VIEW IF EXISTS public.acquisition_channel_metrics;
DROP VIEW IF EXISTS public.referral_program_metrics;
DROP VIEW IF EXISTS public.churn_risk_indicators;

-- Monthly cohort retention view (admin-only via base table RLS)
CREATE VIEW public.acquisition_cohort_metrics
WITH (security_invoker = true)
AS
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
GROUP BY date_trunc('month', p.created_at);

-- Feature adoption metrics view
CREATE VIEW public.feature_adoption_metrics
WITH (security_invoker = true)
AS
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
GROUP BY g.type;

-- Token economics view
CREATE VIEW public.token_economics_metrics
WITH (security_invoker = true)
AS
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
GROUP BY us.plan;

-- Acquisition channel performance view
CREATE VIEW public.acquisition_channel_metrics
WITH (security_invoker = true)
AS
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
GROUP BY sa.utm_source, sa.utm_medium, sa.utm_campaign, sa.signup_method;

-- Referral program metrics view
CREATE VIEW public.referral_program_metrics
WITH (security_invoker = true)
AS
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
GROUP BY rc.id, rc.user_id, p.display_name, rc.code, rc.current_uses, rc.is_active, rc.created_at;

-- Churn risk indicators view
CREATE VIEW public.churn_risk_indicators
WITH (security_invoker = true)
AS
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
WHERE p.last_activity_at IS NOT NULL;

-- Grant select on views to authenticated users
GRANT SELECT ON public.acquisition_cohort_metrics TO authenticated;
GRANT SELECT ON public.feature_adoption_metrics TO authenticated;
GRANT SELECT ON public.token_economics_metrics TO authenticated;
GRANT SELECT ON public.acquisition_channel_metrics TO authenticated;
GRANT SELECT ON public.referral_program_metrics TO authenticated;
GRANT SELECT ON public.churn_risk_indicators TO authenticated;