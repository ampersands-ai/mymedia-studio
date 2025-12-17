-- Fix SECURITY DEFINER warning by recreating view with explicit SECURITY INVOKER
DROP VIEW IF EXISTS public.workflow_templates_public;

CREATE VIEW public.workflow_templates_public 
WITH (security_invoker = true)
AS
SELECT 
  id,
  name,
  description,
  category,
  thumbnail_url,
  before_image_url,
  after_image_url,
  is_active,
  display_order,
  estimated_time_seconds,
  user_input_fields,
  created_at,
  updated_at,
  (workflow_steps->0->>'model_record_id') as primary_model_record_id,
  (workflow_steps->0->>'model_id') as primary_model_id
FROM public.workflow_templates
WHERE is_active = true;

GRANT SELECT ON public.workflow_templates_public TO authenticated;