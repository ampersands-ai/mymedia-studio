-- Migration: Add JSONB Size Constraints for DoS Prevention
--
-- SECURITY: Prevent DoS attacks via oversized JSONB payloads
--
-- This migration adds database-level constraints to limit the size of
-- user-controlled JSONB columns. This provides defense-in-depth alongside
-- application-level Zod validation.
--
-- Maximum size: 50KB per JSONB field (51200 bytes)
--
-- Affected tables:
-- - generations.settings (model parameters)
-- - workflow_executions.user_inputs (workflow user data)
-- - storyboards.voice_settings (voice configuration)

-- Add size constraint to generations.settings
ALTER TABLE public.generations
ADD CONSTRAINT settings_size_check
CHECK (pg_column_size(settings) < 51200);

COMMENT ON CONSTRAINT settings_size_check ON public.generations IS
  'Prevents DoS attacks by limiting settings JSONB to 50KB (51200 bytes)';

-- Add size constraint to workflow_executions.user_inputs
-- Check if table exists first (may not exist in all environments)
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'workflow_executions'
  ) THEN
    ALTER TABLE public.workflow_executions
    ADD CONSTRAINT user_inputs_size_check
    CHECK (pg_column_size(user_inputs) < 51200);

    COMMENT ON CONSTRAINT user_inputs_size_check ON public.workflow_executions IS
      'Prevents DoS attacks by limiting user_inputs JSONB to 50KB (51200 bytes)';
  END IF;
END $$;

-- Add size constraint to storyboards.voice_settings
-- Check if table exists first (may not exist in all environments)
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'storyboards'
  ) THEN
    ALTER TABLE public.storyboards
    ADD CONSTRAINT voice_settings_size_check
    CHECK (pg_column_size(voice_settings) < 51200);

    COMMENT ON CONSTRAINT voice_settings_size_check ON public.storyboards IS
      'Prevents DoS attacks by limiting voice_settings JSONB to 50KB (51200 bytes)';
  END IF;
END $$;

-- Add index on generations.settings for performance
-- (JSONB columns benefit from GIN indexes for JSON path queries)
CREATE INDEX IF NOT EXISTS idx_generations_settings_gin
ON public.generations USING GIN (settings);

COMMENT ON INDEX idx_generations_settings_gin IS
  'GIN index for efficient JSON path queries on settings column';
