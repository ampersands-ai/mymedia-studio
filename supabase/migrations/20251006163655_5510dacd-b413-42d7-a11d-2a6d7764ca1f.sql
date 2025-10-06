-- Fix profiles table RLS policies to prevent unauthorized access
-- Drop existing permissive policies and recreate with proper restrictions

-- Drop all existing policies on profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
DROP POLICY IF EXISTS "Deny unauthenticated access to profiles" ON public.profiles;

-- Create RESTRICTIVE base policy that requires authentication for ALL operations
CREATE POLICY "Require authentication for profiles"
ON public.profiles
AS RESTRICTIVE
FOR ALL
TO public
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Create RESTRICTIVE policy that users can only access their own profile
CREATE POLICY "Users can only access own profile"
ON public.profiles
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Explicit DENY for anonymous users (belt and suspenders approach)
CREATE POLICY "Block all anonymous access to profiles"
ON public.profiles
AS RESTRICTIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Add permissive SELECT policy for authenticated users to view their own data
CREATE POLICY "Authenticated users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Add permissive INSERT policy for authenticated users
CREATE POLICY "Authenticated users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Add permissive UPDATE policy for authenticated users
CREATE POLICY "Authenticated users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Add permissive DELETE policy for authenticated users
CREATE POLICY "Authenticated users can delete own profile"
ON public.profiles
FOR DELETE
TO authenticated
USING (auth.uid() = id);