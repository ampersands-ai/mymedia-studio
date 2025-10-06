-- Fix security issue: Restrict ai_models table access to authenticated users only
DROP POLICY IF EXISTS "Users can view active models" ON public.ai_models;

CREATE POLICY "Authenticated users can view active models"
ON public.ai_models
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL AND is_active = true);

-- Fix security issue: Restrict rate_limit_tiers table access to authenticated users only
DROP POLICY IF EXISTS "Anyone can view rate limit tiers" ON public.rate_limit_tiers;

CREATE POLICY "Authenticated users can view rate limit tiers"
ON public.rate_limit_tiers
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);