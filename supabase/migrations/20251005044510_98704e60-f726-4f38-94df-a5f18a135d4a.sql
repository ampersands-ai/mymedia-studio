-- Insert Kie.ai models into ai_models table

-- Video Generation Models
INSERT INTO public.ai_models (id, model_name, provider, content_type, base_token_cost, is_active, cost_multipliers, input_schema, api_endpoint) VALUES
('sora-2', 'Sora 2', 'kie_ai', 'video', 100, true, '{"hd": 1.5, "resolution_multiplier": 1.2}'::jsonb, '{"prompt": "string", "image": "optional", "duration": "optional", "aspect_ratio": "optional"}'::jsonb, 'https://api.kie.ai/v1/sora-2'),
('kling-2.5-turbo', 'Kling 2.5 Turbo', 'kie_ai', 'video', 80, true, '{"hd": 1.5, "resolution_multiplier": 1.2}'::jsonb, '{"prompt": "string", "image": "optional", "duration": "optional"}'::jsonb, 'https://api.kie.ai/v1/kling-2.5-turbo'),
('wan-2.5', 'Wan 2.5', 'kie_ai', 'video', 90, true, '{"hd": 1.5, "resolution_multiplier": 1.2, "audio_sync": 1.3}'::jsonb, '{"prompt": "string", "image": "optional", "resolution": "optional", "aspect_ratio": "optional"}'::jsonb, 'https://api.kie.ai/v1/wan-2.5'),
('veed-fabric-1.0', 'Veed Fabric 1.0', 'kie_ai', 'video', 70, true, '{"hd": 1.4, "lip_sync": 1.3}'::jsonb, '{"image": "required", "audio": "required", "resolution": "optional"}'::jsonb, 'https://api.kie.ai/v1/veed-fabric-1.0'),
('hailuo-02', 'Hailuo 02', 'kie_ai', 'video', 85, true, '{"hd": 1.5, "resolution_multiplier": 1.3}'::jsonb, '{"prompt": "string", "image": "optional", "resolution": "optional"}'::jsonb, 'https://api.kie.ai/v1/hailuo-02'),
('topaz-video-upscaler', 'Topaz Video Upscaler', 'kie_ai', 'video', 60, true, '{"4k": 2.0, "hd": 1.5}'::jsonb, '{"video": "required", "target_resolution": "optional"}'::jsonb, 'https://api.kie.ai/v1/topaz-video-upscaler'),

-- Image Generation Models
('seedream-4.0', 'Seedream 4.0', 'kie_ai', 'image', 50, true, '{"hd": 1.5, "batch": 1.2}'::jsonb, '{"prompt": "string", "image": "optional", "style": "optional"}'::jsonb, 'https://api.kie.ai/v1/seedream-4.0'),
('recraft-remove-bg', 'Recraft Remove Background', 'kie_ai', 'image', 30, true, '{}'::jsonb, '{"image": "required"}'::jsonb, 'https://api.kie.ai/v1/recraft-remove-bg'),
('recraft-crisp-upscale', 'Recraft Crisp Upscale', 'kie_ai', 'image', 40, true, '{"hd": 1.5}'::jsonb, '{"image": "required", "scale_factor": "optional"}'::jsonb, 'https://api.kie.ai/v1/recraft-crisp-upscale'),
('ideogram-v3-reframe', 'Ideogram V3 Reframe', 'kie_ai', 'image', 45, true, '{"hd": 1.5}'::jsonb, '{"image": "required", "aspect_ratio": "optional", "resolution": "optional"}'::jsonb, 'https://api.kie.ai/v1/ideogram-v3-reframe');
