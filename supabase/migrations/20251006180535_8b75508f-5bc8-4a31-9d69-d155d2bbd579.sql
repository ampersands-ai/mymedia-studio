-- Drop all existing conflicting policies on profiles table
DROP POLICY IF EXISTS "Require authentication for profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can only access own profile" ON public.profiles;
DROP POLICY IF EXISTS "Block all anonymous access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can delete own profile" ON public.profiles;

-- Create a single restrictive policy to block all anonymous access
-- This MUST pass for any operation to proceed
CREATE POLICY "profiles_require_auth"
ON public.profiles
AS RESTRICTIVE
FOR ALL
TO public
USING (auth.uid() IS NOT NULL);

-- Create permissive policies for each operation that allow users to access only their own data
-- At least ONE of these must pass (in addition to the restrictive policy above)
CREATE POLICY "profiles_select_own"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_delete_own"
ON public.profiles
FOR DELETE
TO authenticated
USING (auth.uid() = id);