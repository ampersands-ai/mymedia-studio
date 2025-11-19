
-- Create unique index on (model_name, groups[1], provider)
-- This enforces uniqueness at the database level for the business key
-- Using an index instead of constraint because PostgreSQL doesn't support array element expressions in UNIQUE constraints
CREATE UNIQUE INDEX ai_models_unique_identifier_idx 
ON ai_models (model_name, ((groups->0)::text), provider);

-- Add comment explaining the index
COMMENT ON INDEX ai_models_unique_identifier_idx IS 
'Ensures unique combination of model_name + groups[0] + provider. This is the business key for model identification.';
