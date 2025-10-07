-- Drop the overly permissive service role policy
DROP POLICY IF EXISTS "Service role manages sessions" ON public.user_sessions;

-- The session-manager function should use JWT authentication and rely on ownership policies
-- Users can only manage their own sessions through the existing policies:
-- "Users can view own sessions" and "Users can update own sessions"

-- Ensure session-manager edge function has JWT verification enabled
-- This will be configured in supabase/config.toml