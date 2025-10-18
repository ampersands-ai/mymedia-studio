-- Create kie_credit_audits table for complete API audit trail
CREATE TABLE public.kie_credit_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id uuid NOT NULL REFERENCES public.generations(id) ON DELETE CASCADE,
  
  -- API Request Tracking
  api_request_payload jsonb NOT NULL,
  api_request_sent_at timestamp with time zone NOT NULL,
  
  -- API Response Tracking
  api_callback_payload jsonb NOT NULL,
  api_callback_received_at timestamp with time zone NOT NULL,
  
  -- Credit Analysis
  kie_credits_consumed integer NOT NULL,
  kie_credits_remaining integer,
  our_tokens_charged integer NOT NULL,
  credit_multiplier numeric GENERATED ALWAYS AS (
    CASE 
      WHEN our_tokens_charged > 0 
      THEN ROUND((kie_credits_consumed::numeric / our_tokens_charged::numeric), 2)
      ELSE 0
    END
  ) STORED,
  is_threshold_breach boolean GENERATED ALWAYS AS (
    kie_credits_consumed > (our_tokens_charged / 24.0)
  ) STORED,
  
  -- Metadata
  model_id text NOT NULL,
  task_status text NOT NULL,
  processing_time_seconds integer,
  
  created_at timestamp with time zone DEFAULT now(),
  
  -- Constraint
  CONSTRAINT unique_generation_audit UNIQUE(generation_id)
);

-- Create indexes for performance
CREATE INDEX idx_threshold_breach ON public.kie_credit_audits(is_threshold_breach) 
  WHERE is_threshold_breach = true;
CREATE INDEX idx_credit_multiplier ON public.kie_credit_audits(credit_multiplier DESC);
CREATE INDEX idx_created_at ON public.kie_credit_audits(created_at DESC);
CREATE INDEX idx_model_id ON public.kie_credit_audits(model_id);

-- Enable RLS
ALTER TABLE public.kie_credit_audits ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can view all credit audits"
  ON public.kie_credit_audits
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can insert credit audits"
  ON public.kie_credit_audits
  FOR INSERT
  WITH CHECK (true);