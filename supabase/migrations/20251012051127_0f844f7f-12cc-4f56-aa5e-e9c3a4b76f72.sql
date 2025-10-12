-- Add foreign key from token_dispute_reports.user_id to profiles.id for embedding
ALTER TABLE public.token_dispute_reports
  ADD CONSTRAINT token_dispute_reports_user_fk
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Ensure helpful index for join
CREATE INDEX IF NOT EXISTS idx_token_disputes_user_fk ON public.token_dispute_reports(user_id);