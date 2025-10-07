-- Security Fix 1: Restrict AI Models to Admin Only
-- Drop the overly permissive policy that allows all authenticated users
DROP POLICY IF EXISTS "Authenticated users can view active models" ON public.ai_models;

-- Create admin-only SELECT policy
CREATE POLICY "Admin only access to models"
ON public.ai_models
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Security Fix 2: Require Authentication for Content Templates
-- Drop the public policy
DROP POLICY IF EXISTS "Users can view active templates" ON public.content_templates;

-- Create authenticated-only policy
CREATE POLICY "Authenticated users can view active templates"
ON public.content_templates
FOR SELECT
USING ((auth.uid() IS NOT NULL) AND (is_active = true));

-- Security Fix 3: Restrict Rate Limit Tiers to Admin Only
-- Drop the policy that allows all authenticated users
DROP POLICY IF EXISTS "Authenticated users can view rate limit tiers" ON public.rate_limit_tiers;

-- Create admin-only SELECT policy
CREATE POLICY "Admin only access to rate limit tiers"
ON public.rate_limit_tiers
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));