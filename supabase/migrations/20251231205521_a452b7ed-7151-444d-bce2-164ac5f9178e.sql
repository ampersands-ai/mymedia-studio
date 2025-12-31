-- Drop the existing anon deny policy and replace with a more robust approach
-- The current RESTRICTIVE policy should work, but let's make it clearer and more secure

-- First, drop the existing policies that might have issues
DROP POLICY IF EXISTS "profiles_deny_anon" ON public.profiles;

-- Recreate the SELECT policy to be more explicit - only allow users to see their own profile
-- and explicitly require authentication
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;

CREATE POLICY "profiles_select_own" ON public.profiles
FOR SELECT 
TO authenticated
USING (auth.uid() = id);

-- Ensure no anonymous access is possible by creating a RESTRICTIVE policy
-- that requires authentication for ALL operations
CREATE POLICY "profiles_require_auth" ON public.profiles
AS RESTRICTIVE
FOR ALL
TO public
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Update the existing policies to be more explicit about requiring authenticated role
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;

CREATE POLICY "profiles_insert_own" ON public.profiles
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.profiles
FOR UPDATE 
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_delete_own" ON public.profiles
FOR DELETE 
TO authenticated
USING (auth.uid() = id);