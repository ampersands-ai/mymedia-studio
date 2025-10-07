-- Add explicit RESTRICTIVE policies to deny anonymous SELECT access
-- This ensures no anonymous users can read sensitive data

-- Deny anonymous SELECT on profiles (contains PII: emails, phones, addresses)
CREATE POLICY "Deny anonymous SELECT on profiles"
ON public.profiles
AS RESTRICTIVE
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Deny anonymous SELECT on user_subscriptions (contains payment data)
CREATE POLICY "Deny anonymous SELECT on subscriptions"
ON public.user_subscriptions
AS RESTRICTIVE
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Deny anonymous SELECT on user_sessions (contains session IDs and tracking data)
CREATE POLICY "Deny anonymous SELECT on sessions"
ON public.user_sessions
AS RESTRICTIVE
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Deny anonymous SELECT on generations (contains user prompts and generated content)
CREATE POLICY "Deny anonymous SELECT on generations"
ON public.generations
AS RESTRICTIVE
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Deny anonymous SELECT on audit_logs (contains security audit trail)
CREATE POLICY "Deny anonymous SELECT on audit_logs"
ON public.audit_logs
AS RESTRICTIVE
FOR SELECT
USING (auth.uid() IS NOT NULL);