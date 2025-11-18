-- Update ONLY Google Veo 3.1 Reference model to support array of 1-3 images
-- Target record_id: 6e8a863e-8630-4eef-bdbb-5b41f4c883f9

-- Step 1: Change imageUrls type to array with maxItems: 3
UPDATE ai_models
SET input_schema = jsonb_set(
  jsonb_set(
    jsonb_set(
      input_schema,
      '{properties,imageUrls,type}',
      '"array"'
    ),
    '{properties,imageUrls,items}',
    '{"type": "string"}'
  ),
  '{properties,imageUrls,maxItems}',
  '3'
)
WHERE record_id = '6e8a863e-8630-4eef-bdbb-5b41f4c883f9'
  AND id = 'veo3_fast';

-- Step 2: Update title to reflect 1-3 images
UPDATE ai_models
SET input_schema = jsonb_set(
  input_schema,
  '{properties,imageUrls,title}',
  '"Reference Images (1-3)"'
)
WHERE record_id = '6e8a863e-8630-4eef-bdbb-5b41f4c883f9'
  AND id = 'veo3_fast';

-- Step 3: Update description for clarity
UPDATE ai_models
SET input_schema = jsonb_set(
  input_schema,
  '{properties,imageUrls,description}',
  '"Upload 1-3 reference images. The model will use these images as visual references for video generation."'
)
WHERE record_id = '6e8a863e-8630-4eef-bdbb-5b41f4c883f9'
  AND id = 'veo3_fast';