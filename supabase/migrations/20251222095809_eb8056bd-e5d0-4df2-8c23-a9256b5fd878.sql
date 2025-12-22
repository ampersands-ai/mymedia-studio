-- Create moderation_logs table to track all moderation attempts
CREATE TABLE public.moderation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  prompt TEXT NOT NULL,
  flagged BOOLEAN NOT NULL DEFAULT false,
  flagged_categories TEXT[] DEFAULT '{}',
  category_scores JSONB DEFAULT '{}',
  exempt BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for efficient user lookups
CREATE INDEX idx_moderation_logs_user_id ON public.moderation_logs(user_id);
CREATE INDEX idx_moderation_logs_created_at ON public.moderation_logs(created_at DESC);
CREATE INDEX idx_moderation_logs_flagged ON public.moderation_logs(flagged) WHERE flagged = true;

-- Enable RLS
ALTER TABLE public.moderation_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view all moderation logs
CREATE POLICY "Admins can view all moderation logs"
ON public.moderation_logs FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- Service role can insert logs (from edge function)
CREATE POLICY "Service role can insert moderation logs"
ON public.moderation_logs FOR INSERT
TO authenticated
WITH CHECK (true);

-- Add comment for documentation
COMMENT ON TABLE public.moderation_logs IS 'Tracks all content moderation checks including blocked attempts';