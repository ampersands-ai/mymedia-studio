-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Anyone can view community creations" ON public.community_creations;

-- Create a new policy that requires authentication to view community content
CREATE POLICY "Authenticated users can view community creations" 
ON public.community_creations
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Keep the existing admin and user policies intact
-- (Admins can manage, users can share their own generations)