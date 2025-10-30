-- Fix Runware 100 model numberResults parameter to only accept integers with minimum of 1
UPDATE ai_models 
SET input_schema = jsonb_set(
  jsonb_set(
    input_schema,
    '{properties,numberResults,minimum}',
    '1'
  ),
  '{properties,numberResults,step}',
  '1'
)
WHERE id LIKE 'runware:100%';