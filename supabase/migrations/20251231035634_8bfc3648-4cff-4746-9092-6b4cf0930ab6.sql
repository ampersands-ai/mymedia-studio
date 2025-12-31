-- Drop all existing policies on profiles table to consolidate
DROP POLICY IF EXISTS "Block all anonymous access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Deny anonymous SELECT on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can only access own profile data" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_require_ownership" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

-- Create consolidated, clear RLS policies for profiles
-- Users can only SELECT their own profile
CREATE POLICY "profiles_select_own" ON public.profiles
FOR SELECT TO authenticated
USING (auth.uid() = id);

-- Users can only INSERT their own profile
CREATE POLICY "profiles_insert_own" ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id);

-- Users can only UPDATE their own profile
CREATE POLICY "profiles_update_own" ON public.profiles
FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Users can only DELETE their own profile
CREATE POLICY "profiles_delete_own" ON public.profiles
FOR DELETE TO authenticated
USING (auth.uid() = id);

-- Block anonymous access completely (restrictive policy)
CREATE POLICY "profiles_deny_anon" ON public.profiles
AS RESTRICTIVE
FOR ALL TO anon
USING (false)
WITH CHECK (false);