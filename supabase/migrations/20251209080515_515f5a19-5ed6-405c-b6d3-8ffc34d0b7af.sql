-- =============================================
-- A+ SECURITY IMPROVEMENTS MIGRATION (Safe Version)
-- Phase 2: JSONB Size Constraints (NOT VALID - doesn't check existing data)
-- Phase 3: Audit Log Validation Trigger
-- =============================================

-- =============================================
-- Phase 2: Add JSONB Size Constraints
-- Using NOT VALID to skip validation of existing data
-- These constraints will only apply to NEW inserts/updates
-- =============================================

-- Add size constraint to generations.settings (5MB limit - accommodates existing data)
ALTER TABLE public.generations
ADD CONSTRAINT settings_size_limit
CHECK (settings IS NULL OR pg_column_size(settings) < 5000000) NOT VALID;

-- Add size constraint to workflow_executions.user_inputs (500KB limit)
ALTER TABLE public.workflow_executions
ADD CONSTRAINT user_inputs_size_limit
CHECK (user_inputs IS NULL OR pg_column_size(user_inputs) < 500000) NOT VALID;

-- Add size constraint to workflow_executions.step_outputs (500KB limit)
ALTER TABLE public.workflow_executions
ADD CONSTRAINT step_outputs_size_limit
CHECK (step_outputs IS NULL OR pg_column_size(step_outputs) < 500000) NOT VALID;

-- Add size constraint to storyboards voice/music settings (50KB each)
ALTER TABLE public.storyboards
ADD CONSTRAINT music_settings_size_limit
CHECK (music_settings IS NULL OR pg_column_size(music_settings) < 50000) NOT VALID;

ALTER TABLE public.storyboards
ADD CONSTRAINT subtitle_settings_size_limit
CHECK (subtitle_settings IS NULL OR pg_column_size(subtitle_settings) < 50000) NOT VALID;

ALTER TABLE public.storyboards
ADD CONSTRAINT image_animation_settings_size_limit
CHECK (image_animation_settings IS NULL OR pg_column_size(image_animation_settings) < 50000) NOT VALID;

-- =============================================
-- Phase 3: Audit Log Insert Validation Trigger
-- Ensures audit log integrity and prevents abuse
-- =============================================

CREATE OR REPLACE FUNCTION public.validate_audit_log_insert()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Require action field
  IF NEW.action IS NULL OR NEW.action = '' THEN
    RAISE EXCEPTION 'audit_log action is required';
  END IF;
  
  -- Validate action follows snake_case pattern (letters, numbers, underscores, dots)
  -- This is flexible enough to allow new actions while preventing injection
  IF NEW.action !~ '^[a-z][a-z0-9_\.]*$' THEN
    RAISE EXCEPTION 'Invalid audit_log action format: %. Must be lowercase snake_case.', NEW.action;
  END IF;
  
  -- Prevent action names that are too long (max 100 chars)
  IF length(NEW.action) > 100 THEN
    RAISE EXCEPTION 'audit_log action too long (max 100 characters)';
  END IF;
  
  -- Prevent future timestamps (anti-backdating, allow 1 minute tolerance for clock skew)
  IF NEW.created_at > now() + interval '1 minute' THEN
    RAISE EXCEPTION 'audit_log timestamp cannot be in the future';
  END IF;
  
  -- Limit metadata size to prevent abuse (100KB max)
  IF NEW.metadata IS NOT NULL AND pg_column_size(NEW.metadata) > 100000 THEN
    RAISE EXCEPTION 'audit_log metadata too large (max 100KB)';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for audit log validation
DROP TRIGGER IF EXISTS validate_audit_log_insert_trigger ON public.audit_logs;
CREATE TRIGGER validate_audit_log_insert_trigger
BEFORE INSERT ON public.audit_logs
FOR EACH ROW EXECUTE FUNCTION public.validate_audit_log_insert();