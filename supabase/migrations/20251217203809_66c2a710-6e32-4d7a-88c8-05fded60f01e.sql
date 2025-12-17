-- =====================================================
-- SECURITY FIX: Protect Workflow Template IP
-- Create public view exposing only safe columns
-- Lock down base table to admin-only access
-- =====================================================

-- Phase 1: Create public-safe view
-- Exposes display data + model reference, hides proprietary workflow logic
CREATE OR REPLACE VIEW public.workflow_templates_public AS
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
  -- Extract ONLY model reference from first step (not full workflow logic)
  (workflow_steps->0->>'model_record_id') as primary_model_record_id,
  (workflow_steps->0->>'model_id') as primary_model_id
FROM public.workflow_templates
WHERE is_active = true;

-- Phase 2: Grant SELECT on view to authenticated users
GRANT SELECT ON public.workflow_templates_public TO authenticated;

-- Phase 3: Lock down base table - remove permissive policy
-- Keep admin policy (already exists for full access)
DROP POLICY IF EXISTS "Authenticated users can view active workflows" ON public.workflow_templates;

-- Result:
-- - Authenticated users: Can only see view (no workflow_steps/prompt_templates)
-- - Admins: Full access to base table via existing admin policy
-- - Edge functions (service role): Full access (bypasses RLS)