-- Create enum for dispute status
CREATE TYPE public.dispute_status AS ENUM ('pending', 'reviewed', 'resolved', 'rejected');

-- Create token dispute reports table
CREATE TABLE public.token_dispute_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id UUID NOT NULL REFERENCES public.generations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reason TEXT NOT NULL,
  status dispute_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID,
  admin_notes TEXT
);

-- Enable RLS
ALTER TABLE public.token_dispute_reports ENABLE ROW LEVEL SECURITY;

-- Users can create reports for their own generations
CREATE POLICY "Users can create dispute reports for own generations"
ON public.token_dispute_reports
FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND EXISTS (
    SELECT 1 FROM public.generations 
    WHERE id = generation_id AND user_id = auth.uid()
  )
);

-- Users can view their own reports
CREATE POLICY "Users can view own dispute reports"
ON public.token_dispute_reports
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all reports
CREATE POLICY "Admins can view all dispute reports"
ON public.token_dispute_reports
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Admins can update all reports
CREATE POLICY "Admins can update all dispute reports"
ON public.token_dispute_reports
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster queries
CREATE INDEX idx_token_disputes_status ON public.token_dispute_reports(status);
CREATE INDEX idx_token_disputes_user ON public.token_dispute_reports(user_id);
CREATE INDEX idx_token_disputes_generation ON public.token_dispute_reports(generation_id);