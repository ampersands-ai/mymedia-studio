-- Phase 1 Critical Security Fixes: Block Anonymous Access to Sensitive Tables

-- 1) Block all anonymous access to profiles table
CREATE POLICY "Block all anonymous access to profiles"
ON public.profiles
AS RESTRICTIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- 2) Block all anonymous access to generations table
CREATE POLICY "Block all anonymous access to generations"
ON public.generations
AS RESTRICTIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- 3) Ensure audit_logs cannot be accessed by anonymous users
CREATE POLICY "Block anonymous access to audit logs"
ON public.audit_logs
AS RESTRICTIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- 4) Block anonymous access to user_sessions
CREATE POLICY "Block anonymous access to sessions"
ON public.user_sessions
AS RESTRICTIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- 5) Block anonymous access to user_subscriptions
CREATE POLICY "Block anonymous access to subscriptions"
ON public.user_subscriptions
AS RESTRICTIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- 6) Block anonymous access to user_roles
CREATE POLICY "Block anonymous access to roles"
ON public.user_roles
AS RESTRICTIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);