-- Add RESTRICTIVE policy to ensure users can ONLY access their own sessions
-- This prevents session enumeration and ensures complete data isolation between users

CREATE POLICY "Users can only access own sessions"
ON public.user_sessions
AS RESTRICTIVE
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);