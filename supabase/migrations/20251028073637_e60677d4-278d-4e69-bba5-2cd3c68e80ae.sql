-- CRITICAL SECURITY FIX: Prevent duplicate token refunds for the same generation

-- 1. Fix check_existing_dispute() function to check BOTH active reports AND history
CREATE OR REPLACE FUNCTION public.check_existing_dispute(_generation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Check if dispute exists in active reports OR history
  SELECT EXISTS (
    SELECT 1 FROM public.token_dispute_reports 
    WHERE generation_id = _generation_id
  ) OR EXISTS (
    SELECT 1 FROM public.token_dispute_history 
    WHERE generation_id = _generation_id
  );
$$;

COMMENT ON FUNCTION public.check_existing_dispute(_generation_id uuid) IS 
'Security-critical: Checks if a dispute already exists for a generation in either active reports or history to prevent duplicate refunds';

-- 2. Add unique constraint to prevent duplicate disputes at database level
CREATE UNIQUE INDEX IF NOT EXISTS unique_generation_dispute 
ON public.token_dispute_reports(generation_id);

COMMENT ON INDEX unique_generation_dispute IS 
'Security-critical: Prevents users from creating multiple dispute reports for the same generation';

-- 3. Create trigger function to prevent duplicate refunds
CREATE OR REPLACE FUNCTION public.prevent_duplicate_refund()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if this generation was already refunded
  IF NEW.status = 'resolved' AND NEW.refund_amount > 0 THEN
    IF EXISTS (
      SELECT 1 FROM public.token_dispute_history 
      WHERE generation_id = NEW.generation_id 
      AND refund_amount > 0
    ) THEN
      RAISE EXCEPTION 'Cannot refund: This generation was already refunded (generation_id: %)', NEW.generation_id
        USING ERRCODE = 'integrity_constraint_violation';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 4. Add trigger to token_dispute_reports table
DROP TRIGGER IF EXISTS before_dispute_insert_check_refund ON public.token_dispute_reports;

CREATE TRIGGER before_dispute_insert_check_refund
  BEFORE INSERT ON public.token_dispute_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_duplicate_refund();

COMMENT ON TRIGGER before_dispute_insert_check_refund ON public.token_dispute_reports IS 
'Security-critical: Prevents duplicate refunds by checking history before allowing new dispute insertion';

-- 5. Update RLS policy to be more explicit
DROP POLICY IF EXISTS "Users can create dispute reports for own generations" ON public.token_dispute_reports;

CREATE POLICY "Users can create dispute reports for own generations"
ON public.token_dispute_reports
FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND EXISTS (
    SELECT 1 FROM public.generations 
    WHERE id = token_dispute_reports.generation_id 
    AND user_id = auth.uid()
  )
  AND NOT public.check_existing_dispute(token_dispute_reports.generation_id)
);