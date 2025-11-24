-- ============================================================================
-- Phase 2: Fix Critical Security Vulnerability - Community Creations
-- ============================================================================
-- SECURITY FIX: Prevent user_id exposure in community_creations table
-- Public access must use community_creations_public view which sanitizes data

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view community creations" ON public.community_creations;

-- Create restrictive policy: Only authenticated users can view their own shares
CREATE POLICY "Users can view own community creations"
ON public.community_creations
FOR SELECT
USING (auth.uid() = user_id);

-- Force all public access through the sanitized view
REVOKE SELECT ON public.community_creations FROM anon;
GRANT SELECT ON public.community_creations_public TO anon;
GRANT SELECT ON public.community_creations_public TO authenticated;

-- Add comment explaining the security fix
COMMENT ON POLICY "Users can view own community creations" ON public.community_creations IS 
'Security fix: Restrict direct table access to prevent user_id exposure. Public access must use community_creations_public view.';

-- ============================================================================
-- Phase 3: Add Database-Level JSONB Size Constraints (DoS Prevention)
-- ============================================================================
-- Strategy: Use NOT VALID to skip existing data, then validate incrementally

-- Generations table: Validate settings JSONB size
ALTER TABLE public.generations 
ADD CONSTRAINT settings_size_check 
CHECK (pg_column_size(settings) < 51200) NOT VALID;

-- Workflow executions: Validate user_inputs and step_outputs JSONB size
ALTER TABLE public.workflow_executions 
ADD CONSTRAINT user_inputs_size_check 
CHECK (pg_column_size(user_inputs) < 51200) NOT VALID;

ALTER TABLE public.workflow_executions 
ADD CONSTRAINT step_outputs_size_check 
CHECK (pg_column_size(step_outputs) < 51200) NOT VALID;

-- Storyboards: Validate all JSONB configuration fields
ALTER TABLE public.storyboards 
ADD CONSTRAINT subtitle_settings_size_check 
CHECK (pg_column_size(subtitle_settings) < 51200) NOT VALID;

ALTER TABLE public.storyboards 
ADD CONSTRAINT music_settings_size_check 
CHECK (pg_column_size(music_settings) < 51200) NOT VALID;

ALTER TABLE public.storyboards 
ADD CONSTRAINT image_animation_settings_size_check 
CHECK (pg_column_size(image_animation_settings) < 51200) NOT VALID;

-- Video jobs: Validate caption_style JSONB
ALTER TABLE public.video_jobs 
ADD CONSTRAINT caption_style_size_check 
CHECK (pg_column_size(caption_style) < 51200) NOT VALID;

ALTER TABLE public.video_jobs 
ADD CONSTRAINT error_details_size_check 
CHECK (pg_column_size(error_details) < 51200) NOT VALID;

-- Add descriptive comments
COMMENT ON CONSTRAINT settings_size_check ON public.generations IS 
'DoS prevention: Limit JSONB field size to 50KB. Constraint applied with NOT VALID to allow existing data.';

COMMENT ON CONSTRAINT user_inputs_size_check ON public.workflow_executions IS 
'DoS prevention: Limit JSONB field size to 50KB. Constraint applied with NOT VALID to allow existing data.';

COMMENT ON CONSTRAINT step_outputs_size_check ON public.workflow_executions IS 
'DoS prevention: Limit JSONB field size to 50KB. Constraint applied with NOT VALID to allow existing data.';

COMMENT ON CONSTRAINT subtitle_settings_size_check ON public.storyboards IS 
'DoS prevention: Limit JSONB field size to 50KB. Constraint applied with NOT VALID to allow existing data.';

COMMENT ON CONSTRAINT music_settings_size_check ON public.storyboards IS 
'DoS prevention: Limit JSONB field size to 50KB. Constraint applied with NOT VALID to allow existing data.';

COMMENT ON CONSTRAINT image_animation_settings_size_check ON public.storyboards IS 
'DoS prevention: Limit JSONB field size to 50KB. Constraint applied with NOT VALID to allow existing data.';

COMMENT ON CONSTRAINT caption_style_size_check ON public.video_jobs IS 
'DoS prevention: Limit JSONB field size to 50KB. Constraint applied with NOT VALID to allow existing data.';

COMMENT ON CONSTRAINT error_details_size_check ON public.video_jobs IS 
'DoS prevention: Limit JSONB field size to 50KB. Constraint applied with NOT VALID to allow existing data.';

-- Note: Constraints marked NOT VALID will apply to NEW/UPDATED rows only
-- Existing rows are grandfathered in but won't prevent future oversized inserts