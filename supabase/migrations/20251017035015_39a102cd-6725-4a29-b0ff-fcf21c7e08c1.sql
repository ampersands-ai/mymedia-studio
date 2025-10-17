-- Add composite index on rate_limits for faster lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup 
ON public.rate_limits(identifier, action, last_attempt_at DESC);

-- Add index on user_subscriptions for faster token balance checks
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_tokens 
ON public.user_subscriptions(user_id, tokens_remaining);

-- Add index on generations for rate limiting queries
CREATE INDEX IF NOT EXISTS idx_generations_user_created 
ON public.generations(user_id, created_at DESC) 
WHERE status IN ('completed', 'processing', 'pending');