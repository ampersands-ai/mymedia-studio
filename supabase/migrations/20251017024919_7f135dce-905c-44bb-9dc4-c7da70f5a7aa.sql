-- Step 1: Create trigger for archiving resolved disputes (if not exists)
DROP TRIGGER IF EXISTS archive_dispute_on_resolution ON public.token_dispute_reports;

CREATE TRIGGER archive_dispute_on_resolution
  BEFORE UPDATE ON public.token_dispute_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.archive_resolved_dispute();

-- Step 2: Add uniqueness constraint to prevent duplicate disputes
ALTER TABLE public.token_dispute_reports 
  DROP CONSTRAINT IF EXISTS unique_generation_dispute;

ALTER TABLE public.token_dispute_reports 
  ADD CONSTRAINT unique_generation_dispute 
  UNIQUE (generation_id);

-- Step 3: Create function to check for existing disputes
CREATE OR REPLACE FUNCTION public.check_existing_dispute(_generation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.token_dispute_reports WHERE generation_id = _generation_id
    UNION
    SELECT 1 FROM public.token_dispute_history WHERE generation_id = _generation_id
  );
$$;

-- Step 4: Update RLS policy to prevent duplicate disputes
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
  AND NOT public.check_existing_dispute(generation_id)
);

-- Step 5: Clean up stuck resolved disputes (archive and remove)
-- Use COALESCE to handle NULL values for reviewed_at and reviewed_by
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
  tdr.id,
  tdr.generation_id,
  tdr.user_id,
  tdr.reason,
  tdr.status,
  tdr.created_at,
  COALESCE(tdr.reviewed_at, NOW()),
  COALESCE(tdr.reviewed_by, tdr.user_id),
  tdr.admin_notes,
  tdr.auto_resolved,
  tdr.refund_amount,
  to_jsonb(g.*),
  to_jsonb(p.*)
FROM public.token_dispute_reports tdr
LEFT JOIN public.generations g ON g.id = tdr.generation_id
LEFT JOIN public.profiles p ON p.id = tdr.user_id
WHERE tdr.status IN ('resolved', 'rejected');

-- Delete archived disputes from active table
DELETE FROM public.token_dispute_reports 
WHERE status IN ('resolved', 'rejected');