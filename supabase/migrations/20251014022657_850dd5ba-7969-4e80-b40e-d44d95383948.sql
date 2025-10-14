-- Remove title from required array for Suno model and add conditional required status
-- Step 1: Remove title from required array since it's only required conditionally
UPDATE ai_models 
SET input_schema = jsonb_set(
  input_schema::jsonb,
  '{required}',
  (
    SELECT jsonb_agg(elem)
    FROM jsonb_array_elements_text(input_schema->'required') AS elem
    WHERE elem != 'title'
  )
)
WHERE id = 'V3_5' AND provider = 'kie_ai';

-- Step 2: Update conditional fields to include required status for title
UPDATE ai_models 
SET input_schema = jsonb_set(
  input_schema::jsonb,
  '{conditionalFields}',
  '{
    "title": {"dependsOn": {"customMode": true}, "required": true},
    "weirdnessConstraint": {"dependsOn": {"customMode": true}},
    "negativeTags": {"dependsOn": {"customMode": true}},
    "vocalGender": {"dependsOn": {"customMode": true}},
    "styleWeight": {"dependsOn": {"customMode": true}},
    "audioWeight": {"dependsOn": {"customMode": true}},
    "style": {"dependsOn": {"customMode": true}}
  }'::jsonb
)
WHERE id = 'V3_5' AND provider = 'kie_ai';