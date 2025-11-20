-- Fix security definer view by adding proper RLS policies
-- Drop and recreate view with explicit SECURITY INVOKER
DROP VIEW IF EXISTS public.user_available_credits;

CREATE OR REPLACE VIEW public.user_available_credits 
WITH (security_invoker = true) AS
SELECT 
  us.user_id,
  us.tokens_remaining as total_credits,
  COALESCE(SUM(g.tokens_used - g.tokens_charged), 0) as reserved_credits,
  us.tokens_remaining - COALESCE(SUM(g.tokens_used - g.tokens_charged), 0) as available_credits
FROM public.user_subscriptions us
LEFT JOIN public.generations g ON us.user_id = g.user_id 
  AND g.status IN ('pending', 'processing')
  AND g.tokens_charged < g.tokens_used
GROUP BY us.user_id, us.tokens_remaining;

COMMENT ON VIEW public.user_available_credits IS 'Shows total, reserved (pending), and available credits per user. Uses security_invoker to respect RLS policies.';

-- Add RLS policies for the view
ALTER VIEW public.user_available_credits SET (security_invoker = on);

-- Grant necessary permissions
GRANT SELECT ON public.user_available_credits TO authenticated;