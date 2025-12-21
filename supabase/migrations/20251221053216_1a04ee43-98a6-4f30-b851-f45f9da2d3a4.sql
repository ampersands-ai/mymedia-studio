-- Add billing_period column to user_subscriptions for tracking monthly vs annual billing
ALTER TABLE public.user_subscriptions 
ADD COLUMN IF NOT EXISTS billing_period TEXT DEFAULT 'monthly' 
CHECK (billing_period IN ('monthly', 'annual'));

-- Add comment for documentation
COMMENT ON COLUMN public.user_subscriptions.billing_period IS 'Tracks whether user is on monthly or annual billing. Used for one-time credit boost pricing.';