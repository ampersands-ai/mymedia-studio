-- Phase 1: Add grace period and pending downgrade columns to user_subscriptions
-- This enables the 30-day grace period system and deferred downgrade logic

-- Add grace period columns
ALTER TABLE public.user_subscriptions 
ADD COLUMN IF NOT EXISTS grace_period_end TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS frozen_credits NUMERIC DEFAULT NULL;

-- Add pending downgrade columns  
ALTER TABLE public.user_subscriptions
ADD COLUMN IF NOT EXISTS pending_downgrade_plan TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS pending_downgrade_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.user_subscriptions.grace_period_end IS 'End date of 30-day grace period after cancellation. Credits are frozen until this date.';
COMMENT ON COLUMN public.user_subscriptions.frozen_credits IS 'Credit balance frozen during grace period. Restored if user resubscribes within grace period.';
COMMENT ON COLUMN public.user_subscriptions.pending_downgrade_plan IS 'Plan to switch to at end of current billing period (for deferred downgrades).';
COMMENT ON COLUMN public.user_subscriptions.pending_downgrade_at IS 'Timestamp when pending downgrade should be applied.';

-- Create index for efficient grace period processing
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_grace_period_end 
ON public.user_subscriptions (grace_period_end) 
WHERE grace_period_end IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_pending_downgrade 
ON public.user_subscriptions (pending_downgrade_at) 
WHERE pending_downgrade_at IS NOT NULL;