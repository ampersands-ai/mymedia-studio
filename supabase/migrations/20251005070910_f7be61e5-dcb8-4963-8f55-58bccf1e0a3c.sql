-- Fix rate_limits table RLS to restrict access to service role only
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Service role full access" ON public.rate_limits;

-- Create restrictive policies that deny all user access
-- Service role bypasses RLS, so it will still have full access
CREATE POLICY "Deny all SELECT access to users"
ON public.rate_limits
FOR SELECT
TO authenticated
USING (false);

CREATE POLICY "Deny all INSERT access to users"
ON public.rate_limits
FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY "Deny all UPDATE access to users"
ON public.rate_limits
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "Deny all DELETE access to users"
ON public.rate_limits
FOR DELETE
TO authenticated
USING (false);