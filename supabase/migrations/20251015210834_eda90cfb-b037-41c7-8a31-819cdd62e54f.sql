-- Create a dedicated history table for resolved/rejected disputes
CREATE TABLE public.token_dispute_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID NOT NULL UNIQUE,
  generation_id UUID NOT NULL,
  user_id UUID NOT NULL,
  reason TEXT NOT NULL,
  status dispute_status NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE NOT NULL,
  reviewed_by UUID NOT NULL,
  admin_notes TEXT,
  auto_resolved BOOLEAN DEFAULT FALSE,
  refund_amount INTEGER,
  archived_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  generation_snapshot JSONB NOT NULL,
  profile_snapshot JSONB NOT NULL
);

-- Enable RLS
ALTER TABLE public.token_dispute_history ENABLE ROW LEVEL SECURITY;

-- Admins can view history
CREATE POLICY "Admins can view dispute history"
ON public.token_dispute_history
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Create indexes
CREATE INDEX idx_dispute_history_user ON public.token_dispute_history(user_id);
CREATE INDEX idx_dispute_history_status ON public.token_dispute_history(status);
CREATE INDEX idx_dispute_history_archived ON public.token_dispute_history(archived_at);
CREATE INDEX idx_dispute_history_dispute_id ON public.token_dispute_history(dispute_id);

-- Function to automatically archive resolved/rejected disputes
CREATE OR REPLACE FUNCTION public.archive_resolved_dispute()
RETURNS TRIGGER AS $$
BEGIN
  -- Only archive when status changes to resolved or rejected
  IF NEW.status IN ('resolved', 'rejected') AND 
     (OLD.status IS NULL OR OLD.status NOT IN ('resolved', 'rejected')) THEN
    
    -- Insert into history table with snapshots
    INSERT INTO public.token_dispute_history (
      dispute_id,
      generation_id,
      user_id,
      reason,
      status,
      created_at,
      reviewed_at,
      reviewed_by,
      admin_notes,
      auto_resolved,
      refund_amount,
      generation_snapshot,
      profile_snapshot
    )
    SELECT 
      NEW.id,
      NEW.generation_id,
      NEW.user_id,
      NEW.reason,
      NEW.status,
      NEW.created_at,
      NEW.reviewed_at,
      NEW.reviewed_by,
      NEW.admin_notes,
      NEW.auto_resolved,
      NEW.refund_amount,
      to_jsonb(g.*),
      to_jsonb(p.*)
    FROM public.generations g
    LEFT JOIN public.profiles p ON p.id = NEW.user_id
    WHERE g.id = NEW.generation_id;
    
    -- Delete from active disputes table
    DELETE FROM public.token_dispute_reports WHERE id = NEW.id;
    
    -- Return NULL to prevent the UPDATE from completing on active table
    RETURN NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER archive_dispute_on_resolution
  BEFORE UPDATE ON public.token_dispute_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.archive_resolved_dispute();