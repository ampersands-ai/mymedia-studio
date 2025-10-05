-- Add groups column to ai_models table to support multi-group classification
ALTER TABLE public.ai_models
ADD COLUMN groups jsonb DEFAULT '[]'::jsonb;

-- Update existing models with their group classifications

-- Image Editing models
UPDATE public.ai_models SET groups = '["image_editing"]'::jsonb WHERE id IN ('kie-image-editor-v1', 'recraft-crisp-upscale', 'recraft-remove-background');

-- Prompt to Image models
UPDATE public.ai_models SET groups = '["prompt_to_image"]'::jsonb WHERE id IN ('kie-image-generator-v1', 'seedream-4-0', 'ideogram-v3-reframe');

-- Prompt to Video models
UPDATE public.ai_models SET groups = '["prompt_to_video"]'::jsonb WHERE id IN ('kie-video-generator-v1', 'sora-2', 'hailuo-02', 'kling-2-5-turbo', 'veed-fabric-1-0');

-- Prompt to Audio models
UPDATE public.ai_models SET groups = '["prompt_to_audio"]'::jsonb WHERE id IN ('kie-audio-generator-v1');

-- Multi-group models (appear in multiple categories)
-- These are examples - adjust based on actual model IDs in your database
UPDATE public.ai_models SET groups = '["image_editing", "prompt_to_image"]'::jsonb WHERE id LIKE '%flux-kontext%' OR id LIKE '%flux1-kontext%';
UPDATE public.ai_models SET groups = '["image_editing", "prompt_to_image"]'::jsonb WHERE id LIKE '%ideogram-reframe%';
UPDATE public.ai_models SET groups = '["image_to_video", "prompt_to_video"]'::jsonb WHERE id LIKE '%luma%' OR id LIKE '%wan%';
UPDATE public.ai_models SET groups = '["image_editing", "image_to_video", "prompt_to_video"]'::jsonb WHERE id LIKE '%runway-gen4-aleph%';

-- Add comment to explain the groups column
COMMENT ON COLUMN public.ai_models.groups IS 'Array of group classifications: image_editing, prompt_to_image, prompt_to_video, image_to_video, prompt_to_audio';