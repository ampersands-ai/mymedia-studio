-- Fix critical security issue: Remove overly permissive INSERT policy on user_subscriptions
-- The handle_new_user() trigger function is SECURITY DEFINER, so it will bypass RLS
-- and can still insert subscriptions without this policy
DROP POLICY IF EXISTS "System can insert user subscription" ON public.user_subscriptions;

-- Add DELETE policy on profiles table for GDPR compliance
-- Allows users to delete their own profile data
CREATE POLICY "Users can delete own profile" 
ON public.profiles 
FOR DELETE 
USING (auth.uid() = id);

-- Add DELETE policy on user_subscriptions for data privacy
-- Allows users to delete their own subscription records
CREATE POLICY "Users can delete own subscription" 
ON public.user_subscriptions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add DELETE policy on generations for data privacy
-- Allows users to delete their own generation history
CREATE POLICY "Users can delete own generations" 
ON public.generations 
FOR DELETE 
USING (auth.uid() = user_id);