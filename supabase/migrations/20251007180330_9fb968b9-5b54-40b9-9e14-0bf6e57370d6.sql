-- Add RESTRICTIVE policy to ensure users can ONLY access their own profile
-- This prevents timing attacks and ensures complete data isolation between users

CREATE POLICY "Users can only access own profile data"
ON public.profiles
AS RESTRICTIVE
FOR ALL
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);