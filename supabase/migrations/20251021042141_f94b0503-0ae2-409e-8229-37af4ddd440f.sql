-- Update check_existing_dispute function to always allow reports
-- This removes the duplicate check and enables reporting regardless of existing disputes
CREATE OR REPLACE FUNCTION public.check_existing_dispute(_generation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Always allow reports (don't block duplicates)
  SELECT false;
$$;