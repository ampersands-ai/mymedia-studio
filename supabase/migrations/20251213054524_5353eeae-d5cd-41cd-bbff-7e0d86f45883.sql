-- Create email_verification_tokens table for custom email verification flow
CREATE TABLE public.email_verification_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  token TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  used_at TIMESTAMP WITH TIME ZONE
);

-- Create index on token for fast lookups
CREATE INDEX idx_email_verification_tokens_token ON public.email_verification_tokens(token);

-- Create index on user_id for user-specific queries
CREATE INDEX idx_email_verification_tokens_user_id ON public.email_verification_tokens(user_id);

-- Enable Row Level Security
ALTER TABLE public.email_verification_tokens ENABLE ROW LEVEL SECURITY;

-- Users can view their own tokens
CREATE POLICY "Users can view own verification tokens"
ON public.email_verification_tokens
FOR SELECT
USING (auth.uid() = user_id);

-- Service role can insert tokens (edge functions)
CREATE POLICY "Service role can insert verification tokens"
ON public.email_verification_tokens
FOR INSERT
WITH CHECK (true);

-- Service role can update tokens (mark as used)
CREATE POLICY "Service role can update verification tokens"
ON public.email_verification_tokens
FOR UPDATE
USING (true);

-- Cleanup function for expired tokens
CREATE OR REPLACE FUNCTION public.cleanup_expired_verification_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.email_verification_tokens
  WHERE expires_at < NOW() OR used_at IS NOT NULL;
END;
$$;