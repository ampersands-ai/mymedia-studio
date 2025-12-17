-- =====================================================
-- SECURITY FIX: Lock Down Token Tables
-- Remove all client access to security-sensitive tables
-- Edge functions (service role) bypass RLS and continue working
-- =====================================================

-- Phase 1: Drop ALL policies from password_reset_tokens (CRITICAL)
DROP POLICY IF EXISTS "Service role can manage password reset tokens" ON public.password_reset_tokens;

-- Phase 2: Drop ALL policies from email_verification_tokens
DROP POLICY IF EXISTS "Service role can insert verification tokens" ON public.email_verification_tokens;
DROP POLICY IF EXISTS "Service role can update verification tokens" ON public.email_verification_tokens;
DROP POLICY IF EXISTS "Users can view own verification tokens" ON public.email_verification_tokens;

-- Phase 3: Ensure RLS is ENABLED (blocks all client access when no policies exist)
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_verification_tokens ENABLE ROW LEVEL SECURITY;

-- Result: Zero client access to these tables
-- Service role (edge functions) continues to work normally