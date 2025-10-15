-- Update ideogram/character model to use array type for reference_image_urls
UPDATE ai_models 
SET input_schema = jsonb_set(
  input_schema,
  '{properties,reference_image_urls}',
  '{"type": "array", "items": {"type": "string"}, "title": "Upload your reference image"}'::jsonb
)
WHERE id = 'ideogram/character';