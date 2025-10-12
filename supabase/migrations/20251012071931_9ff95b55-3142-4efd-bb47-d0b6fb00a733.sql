-- Allow anyone (authenticated and anonymous) to view community creations
CREATE POLICY "Anyone can view community creations"
ON public.community_creations FOR SELECT
USING (true);

-- Create index for better performance when fetching community creations
CREATE INDEX IF NOT EXISTS idx_community_creations_shared_at 
ON public.community_creations(shared_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_creations_featured 
ON public.community_creations(is_featured, shared_at DESC);