-- Add Dodo Payments columns to user_subscriptions table
ALTER TABLE public.user_subscriptions
ADD COLUMN IF NOT EXISTS dodo_subscription_id text,
ADD COLUMN IF NOT EXISTS dodo_customer_id text,
ADD COLUMN IF NOT EXISTS last_webhook_event text,
ADD COLUMN IF NOT EXISTS last_webhook_at timestamp with time zone;

-- Create index for faster webhook lookups
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_dodo_subscription 
ON public.user_subscriptions(dodo_subscription_id);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_dodo_customer 
ON public.user_subscriptions(dodo_customer_id);