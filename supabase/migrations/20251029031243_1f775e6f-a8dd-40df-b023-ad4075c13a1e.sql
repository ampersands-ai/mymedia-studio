-- Insert Runware AI models
INSERT INTO public.ai_models (
  id,
  provider,
  model_name,
  content_type,
  base_token_cost,
  cost_multipliers,
  input_schema,
  is_active,
  groups,
  estimated_time_seconds,
  max_images,
  api_endpoint,
  payload_structure
) VALUES
-- Runware Flux Fast Model
(
  'runware-flux-fast',
  'runware',
  'runware:100@1',
  'image',
  10,
  '{"width": {"512": 1, "1024": 1.5, "2048": 2}, "height": {"512": 1, "1024": 1.5, "2048": 2}, "numberResults": 1}'::jsonb,
  '{
    "prompt": {"type": "string", "required": true, "label": "Prompt", "description": "Text description of the image to generate"},
    "negativePrompt": {"type": "string", "required": false, "label": "Negative Prompt", "description": "What to avoid in the image"},
    "width": {"type": "number", "required": false, "default": 512, "label": "Width", "options": [512, 768, 1024, 1536, 2048]},
    "height": {"type": "number", "required": false, "default": 512, "label": "Height", "options": [512, 768, 1024, 1536, 2048]},
    "steps": {"type": "number", "required": false, "default": 20, "min": 1, "max": 50, "label": "Steps"},
    "seed": {"type": "number", "required": false, "label": "Seed", "description": "Random seed for reproducibility"},
    "numberResults": {"type": "number", "required": false, "default": 1, "min": 1, "max": 4, "label": "Number of Images"}
  }'::jsonb,
  true,
  '["prompt_to_image"]'::jsonb,
  15,
  4,
  'https://api.runware.ai/v1',
  'flat'
),
-- Runware SDXL Model
(
  'runware-sdxl',
  'runware',
  'runware:101@1',
  'image',
  15,
  '{"width": {"512": 1, "1024": 1.5, "2048": 2.5}, "height": {"512": 1, "1024": 1.5, "2048": 2.5}, "numberResults": 1}'::jsonb,
  '{
    "prompt": {"type": "string", "required": true, "label": "Prompt", "description": "Text description of the image to generate"},
    "negativePrompt": {"type": "string", "required": false, "label": "Negative Prompt", "description": "What to avoid in the image"},
    "width": {"type": "number", "required": false, "default": 1024, "label": "Width", "options": [512, 768, 1024, 1536, 2048]},
    "height": {"type": "number", "required": false, "default": 1024, "label": "Height", "options": [512, 768, 1024, 1536, 2048]},
    "steps": {"type": "number", "required": false, "default": 30, "min": 1, "max": 50, "label": "Steps"},
    "seed": {"type": "number", "required": false, "label": "Seed", "description": "Random seed for reproducibility"},
    "numberResults": {"type": "number", "required": false, "default": 1, "min": 1, "max": 4, "label": "Number of Images"}
  }'::jsonb,
  true,
  '["prompt_to_image"]'::jsonb,
  25,
  4,
  'https://api.runware.ai/v1',
  'flat'
),
-- Runware Upscale Model (disabled initially)
(
  'runware-upscale',
  'runware',
  'runware:upscale',
  'image',
  20,
  '{"upscaleFactor": {"2": 1, "4": 2, "8": 3}}'::jsonb,
  '{
    "inputImage": {"type": "file", "required": true, "accept": "image/*", "label": "Input Image", "description": "Image to upscale"},
    "upscaleFactor": {"type": "number", "required": false, "default": 2, "label": "Upscale Factor", "options": [2, 4, 8]}
  }'::jsonb,
  false,
  '["image_editing"]'::jsonb,
  20,
  1,
  'https://api.runware.ai/v1',
  'flat'
);