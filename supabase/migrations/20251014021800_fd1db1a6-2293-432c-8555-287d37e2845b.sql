-- Add conditional field visibility for Suno model's Custom Mode
UPDATE ai_models 
SET input_schema = jsonb_set(
  input_schema::jsonb,
  '{conditionalFields}',
  '{
    "title": {"dependsOn": {"customMode": true}},
    "weirdnessConstraint": {"dependsOn": {"customMode": true}},
    "negativeTags": {"dependsOn": {"customMode": true}},
    "vocalGender": {"dependsOn": {"customMode": true}},
    "styleWeight": {"dependsOn": {"customMode": true}},
    "audioWeight": {"dependsOn": {"customMode": true}},
    "style": {"dependsOn": {"customMode": true}}
  }'::jsonb
)
WHERE id = 'V3_5' AND provider = 'kie_ai';