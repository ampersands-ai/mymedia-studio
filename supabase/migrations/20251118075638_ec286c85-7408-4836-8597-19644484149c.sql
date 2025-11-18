-- Fix schema inconsistency for Veo 3.1 Fast (Image-to-Video)
-- Set imageInputField to "imageUrls" to match the HQ variant
UPDATE ai_models
SET input_schema = jsonb_set(
  input_schema,
  '{imageInputField}',
  '"imageUrls"'
)
WHERE record_id = '8aac94cb-5625-47f4-880c-4f0fd8bd83a1';