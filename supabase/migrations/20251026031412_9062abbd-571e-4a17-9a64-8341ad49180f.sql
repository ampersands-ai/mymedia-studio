-- Migration: Create share_tokens table for secure sharing
CREATE TABLE IF NOT EXISTS public.share_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  generation_id UUID REFERENCES public.generations(id) ON DELETE CASCADE,
  video_job_id UUID REFERENCES public.video_jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  bucket_name TEXT NOT NULL DEFAULT 'generated-content',
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  view_count INTEGER NOT NULL DEFAULT 0,
  last_viewed_at TIMESTAMPTZ,
  CONSTRAINT valid_reference CHECK (
    (generation_id IS NOT NULL AND video_job_id IS NULL) OR
    (generation_id IS NULL AND video_job_id IS NOT NULL)
  )
);

-- Index for fast token lookup
CREATE INDEX idx_share_tokens_token ON public.share_tokens(token);
CREATE INDEX idx_share_tokens_expires_at ON public.share_tokens(expires_at);
CREATE INDEX idx_share_tokens_user_id ON public.share_tokens(user_id);

-- RLS Policies
ALTER TABLE public.share_tokens ENABLE ROW LEVEL SECURITY;

-- Users can view their own share tokens
CREATE POLICY "Users can view own share tokens"
  ON public.share_tokens
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create share tokens for their own content
CREATE POLICY "Users can create own share tokens"
  ON public.share_tokens
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own share tokens
CREATE POLICY "Users can delete own share tokens"
  ON public.share_tokens
  FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can view all share tokens
CREATE POLICY "Admins can view all share tokens"
  ON public.share_tokens
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

COMMENT ON TABLE public.share_tokens IS 'Stores secure share tokens for generated content with expiration';
COMMENT ON COLUMN public.share_tokens.token IS 'Random token used in shareable URL (e.g., nanoid 21 chars)';
COMMENT ON COLUMN public.share_tokens.expires_at IS 'Token expiration timestamp (default 7 days)';
COMMENT ON COLUMN public.share_tokens.view_count IS 'Number of times this share link was accessed';