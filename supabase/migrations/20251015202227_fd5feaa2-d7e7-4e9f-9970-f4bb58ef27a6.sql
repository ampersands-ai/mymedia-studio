-- Update ideogram/character model to use file upload instead of URL for reference images
UPDATE ai_models 
SET input_schema = jsonb_set(
  input_schema,
  '{properties,reference_image_urls}',
  '{"type": "string", "title": "Upload your reference image"}'::jsonb
)
WHERE id = 'ideogram/character';