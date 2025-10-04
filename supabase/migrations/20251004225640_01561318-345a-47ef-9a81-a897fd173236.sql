-- Fix Critical Rate Limiting Issue
-- Drop the broken policy that blocks all access including service role
DROP POLICY IF EXISTS "Service role only" ON public.rate_limits;

-- Create new policy allowing service role full access for rate limiting functionality
CREATE POLICY "Service role full access" 
ON public.rate_limits 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Add explicit INSERT deny policy for user_subscriptions
-- Subscriptions should only be created via the handle_new_user trigger, not directly by clients
CREATE POLICY "Prevent direct subscription inserts" 
ON public.user_subscriptions 
FOR INSERT 
WITH CHECK (false);