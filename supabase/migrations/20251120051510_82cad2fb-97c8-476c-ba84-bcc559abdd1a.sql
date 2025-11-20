-- Add tokens_charged column to track actual charges vs reserved
ALTER TABLE public.generations 
ADD COLUMN tokens_charged NUMERIC DEFAULT 0;

COMMENT ON COLUMN public.generations.tokens_charged IS 'Actual credits charged after completion. tokens_used is reserved amount.';

-- Create index for efficient credit calculation queries
CREATE INDEX idx_generations_pending_credits ON public.generations(user_id, status) 
WHERE status IN ('pending', 'processing');

-- Create view for available credits (total - reserved)
CREATE OR REPLACE VIEW public.user_available_credits AS
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

COMMENT ON VIEW public.user_available_credits IS 'Shows total, reserved (pending), and available credits per user';