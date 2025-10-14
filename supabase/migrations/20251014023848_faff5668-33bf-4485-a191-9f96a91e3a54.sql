-- Remove customMode from required fields for Suno audio model
-- customMode is a boolean with a default value, so it shouldn't be required
UPDATE ai_models
SET input_schema = jsonb_set(
  input_schema::jsonb,
  '{required}',
  '["prompt", "model", "instrumental"]'::jsonb
)
WHERE id = 'V3_5' AND provider = 'kie_ai';