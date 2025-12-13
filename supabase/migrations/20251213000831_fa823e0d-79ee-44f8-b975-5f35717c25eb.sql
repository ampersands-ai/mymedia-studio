-- Allow authenticated users to read rate limit tiers
CREATE POLICY "Authenticated users can read rate limit tiers"
ON public.rate_limit_tiers
FOR SELECT
TO authenticated
USING (true);