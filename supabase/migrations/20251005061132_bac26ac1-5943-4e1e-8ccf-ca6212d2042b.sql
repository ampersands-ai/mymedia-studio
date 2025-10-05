-- Fix RLS policy for ai_models table to allow admin CRUD operations
DROP POLICY IF EXISTS "Admins can manage all models" ON public.ai_models;

CREATE POLICY "Admins can manage all models" 
ON public.ai_models
FOR ALL
TO public
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));