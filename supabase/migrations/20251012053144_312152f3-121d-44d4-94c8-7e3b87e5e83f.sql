-- Add auto_resolved and refund_amount fields to token_dispute_reports
ALTER TABLE public.token_dispute_reports 
ADD COLUMN auto_resolved BOOLEAN DEFAULT FALSE,
ADD COLUMN refund_amount INTEGER;

-- Add index for filtering auto-resolved disputes
CREATE INDEX idx_token_disputes_auto_resolved ON public.token_dispute_reports(auto_resolved);