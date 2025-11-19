-- Migration: Deprecate input_schema column in favor of .ts files
-- Phase: File-Based Model System
-- Date: 2025-01-19

-- Make input_schema nullable
ALTER TABLE ai_models ALTER COLUMN input_schema DROP NOT NULL;

-- Add comment
COMMENT ON COLUMN ai_models.input_schema IS 
'DEPRECATED (Jan 2025): Schema now lives in .ts files. Database only stores metadata.';

-- Generate default file paths for existing models
UPDATE ai_models
SET locked_file_path = 
  COALESCE(
    groups->0->>0,
    'uncategorized'
  ) || '/' || 
  regexp_replace(
    regexp_replace(model_name, '[^a-zA-Z0-9_-]', '_', 'g'),
    '_{2,}', '_', 'g'
  ) || '.ts'
WHERE locked_file_path IS NULL;