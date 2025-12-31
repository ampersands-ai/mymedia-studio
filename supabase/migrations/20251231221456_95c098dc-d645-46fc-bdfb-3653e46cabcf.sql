-- Phase 1: Simplify profiles table RLS to gold standard pattern
-- Remove the redundant RESTRICTIVE policy - the explicit TO authenticated is sufficient

DROP POLICY IF EXISTS "profiles_require_auth" ON public.profiles;

-- The remaining policies are now the gold standard:
-- profiles_select_own: SELECT for authenticated where auth.uid() = id
-- profiles_insert_own: INSERT for authenticated where auth.uid() = id  
-- profiles_update_own: UPDATE for authenticated where auth.uid() = id
-- profiles_delete_own: DELETE for authenticated where auth.uid() = id