-- Fix ai_models RLS policies to allow authenticated users to view active models
DROP POLICY IF EXISTS "Admin only access to models" ON public.ai_models;
DROP POLICY IF EXISTS "Admins can manage all models" ON public.ai_models;

CREATE POLICY "Authenticated users can view active models" 
ON public.ai_models
FOR SELECT
TO authenticated
USING (is_active = true);

CREATE POLICY "Admins can manage all models" 
ON public.ai_models
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Fix content_templates RLS policies to allow authenticated users to view active templates
DROP POLICY IF EXISTS "Admins can manage all templates" ON public.content_templates;
DROP POLICY IF EXISTS "Authenticated users can view active templates" ON public.content_templates;

CREATE POLICY "Authenticated users can view active templates" 
ON public.content_templates
FOR SELECT
TO authenticated
USING (is_active = true);

CREATE POLICY "Admins can manage templates" 
ON public.content_templates
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));