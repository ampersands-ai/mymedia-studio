-- Add payload_structure column to ai_models table
ALTER TABLE ai_models 
ADD COLUMN payload_structure text NOT NULL DEFAULT 'wrapper'
CHECK (payload_structure IN ('flat', 'wrapper'));

-- Add comment for documentation
COMMENT ON COLUMN ai_models.payload_structure IS 'Defines API payload structure: flat (top-level params) or wrapper (nested in input object)';