-- Add Stripe-related columns to user_subscriptions for backup payment gateway tracking
ALTER TABLE public.user_subscriptions 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS payment_provider TEXT DEFAULT 'dodo';

-- Add index for Stripe customer lookup
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_customer 
ON public.user_subscriptions(stripe_customer_id) 
WHERE stripe_customer_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.user_subscriptions.payment_provider IS 'Payment gateway used: dodo (primary) or stripe (backup)';
COMMENT ON COLUMN public.user_subscriptions.stripe_customer_id IS 'Stripe customer ID when using Stripe as payment gateway';
COMMENT ON COLUMN public.user_subscriptions.stripe_subscription_id IS 'Stripe subscription ID when using Stripe as payment gateway';