-- Update unclassified models with proper group assignments
UPDATE ai_models SET groups = '["prompt_to_audio"]'::jsonb WHERE id = 'kie-audio-gen-v1';
UPDATE ai_models SET groups = '["image_editing"]'::jsonb WHERE id = 'kie-image-edit-v1';
UPDATE ai_models SET groups = '["prompt_to_image"]'::jsonb WHERE id = 'kie-image-gen-v1';
UPDATE ai_models SET groups = '["prompt_to_video"]'::jsonb WHERE id = 'kie-video-gen-v1';
UPDATE ai_models SET groups = '["prompt_to_video"]'::jsonb WHERE id = 'kling-2.5-turbo';
UPDATE ai_models SET groups = '["image_editing"]'::jsonb WHERE id = 'recraft-remove-bg';
UPDATE ai_models SET groups = '["prompt_to_image"]'::jsonb WHERE id = 'seedream-4.0';
UPDATE ai_models SET groups = '["image_editing", "image_to_video"]'::jsonb WHERE id = 'topaz-video-upscaler';
UPDATE ai_models SET groups = '["prompt_to_video", "prompt_to_audio"]'::jsonb WHERE id = 'veed-fabric-1.0';