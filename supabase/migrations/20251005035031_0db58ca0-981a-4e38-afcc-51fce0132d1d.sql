-- Insert AI Models
INSERT INTO public.ai_models (id, provider, model_name, content_type, base_token_cost, cost_multipliers, input_schema, api_endpoint, is_active) VALUES
-- Image Models
('kie-image-gen-v1', 'kie_ai', 'Kie Image Generator V1', 'image', 50, '{"hd": 1.5, "uploaded_image": 10}'::jsonb, '{"prompt": "string", "resolution": "enum(native,hd)"}'::jsonb, 'https://api.kie.ai/v1/generate/image', true),
('kie-image-edit-v1', 'kie_ai', 'Kie Image Editor V1', 'image', 40, '{"hd": 1.5, "uploaded_image": 15}'::jsonb, '{"prompt": "string", "image_url": "string", "resolution": "enum(native,hd)"}'::jsonb, 'https://api.kie.ai/v1/edit/image', true),

-- Video Models
('kie-video-gen-v1', 'kie_ai', 'Kie Video Generator V1', 'video', 200, '{"hd": 2.0, "duration_multiplier": 50}'::jsonb, '{"prompt": "string", "duration": "number", "resolution": "enum(native,hd)"}'::jsonb, 'https://api.kie.ai/v1/generate/video', true),

-- Text Models
('kie-text-gen-v1', 'kie_ai', 'Kie Text Generator V1', 'text', 20, '{"long_form": 1.5}'::jsonb, '{"prompt": "string", "max_length": "number"}'::jsonb, 'https://api.kie.ai/v1/generate/text', true),

-- Audio Models
('kie-audio-gen-v1', 'kie_ai', 'Kie Audio Generator V1', 'audio', 150, '{"duration_multiplier": 30, "hd": 1.5}'::jsonb, '{"prompt": "string", "duration": "number"}'::jsonb, 'https://api.kie.ai/v1/generate/audio', true);

-- Insert Content Templates
INSERT INTO public.content_templates (id, category, name, description, model_id, preset_parameters, enhancement_instruction, thumbnail_url, display_order, is_active) VALUES
-- Image Templates
('tmpl-portrait-pro', 'portraits', 'Professional Portrait', 'Create professional headshot portraits with studio lighting', 'kie-image-gen-v1', '{"style": "professional", "lighting": "studio"}'::jsonb, 'Create a professional portrait with clean studio lighting, neutral background, and sharp focus on the subject', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop', 10, true),
('tmpl-portrait-creative', 'portraits', 'Creative Portrait', 'Artistic portraits with unique styling and backgrounds', 'kie-image-gen-v1', '{"style": "artistic", "mood": "creative"}'::jsonb, 'Create an artistic portrait with creative lighting, interesting composition, and unique background elements', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop', 20, true),

('tmpl-product-white', 'products', 'Product - White Background', 'Clean product photos on white background', 'kie-image-gen-v1', '{"background": "white", "lighting": "professional"}'::jsonb, 'Create a professional product photo with pure white background, even lighting, and sharp details', 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop', 30, true),
('tmpl-product-lifestyle', 'products', 'Product - Lifestyle Scene', 'Products in realistic lifestyle settings', 'kie-image-gen-v1', '{"background": "lifestyle", "context": "realistic"}'::jsonb, 'Create a lifestyle product photo showing the item in a realistic, attractive setting with natural context', 'https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=400&h=400&fit=crop', 40, true),

('tmpl-social-instagram', 'social-media', 'Instagram Story', 'Eye-catching Instagram story graphics', 'kie-image-gen-v1', '{"aspect_ratio": "9:16", "style": "modern"}'::jsonb, 'Create a vibrant Instagram story graphic with modern design, bold colors, and engaging composition', 'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=400&h=400&fit=crop', 50, true),
('tmpl-social-post', 'social-media', 'Social Media Post', 'Engaging social media post graphics', 'kie-image-gen-v1', '{"aspect_ratio": "1:1", "style": "engaging"}'::jsonb, 'Create an eye-catching social media post graphic with balanced composition and attention-grabbing elements', 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&h=400&fit=crop', 60, true),

-- Photo Editing Templates
('tmpl-edit-enhance', 'editing', 'Photo Enhancement', 'AI-powered photo enhancement and color correction', 'kie-image-edit-v1', '{"enhance": true, "auto_correct": true}'::jsonb, 'Enhance the photo with improved colors, contrast, and clarity while maintaining natural look', 'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=400&h=400&fit=crop', 70, true),
('tmpl-edit-background', 'editing', 'Background Removal', 'Remove or replace image backgrounds', 'kie-image-edit-v1', '{"remove_background": true}'::jsonb, 'Remove the background from the image cleanly, preserving subject details and edges', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=400&fit=crop', 80, true),

-- Video Templates
('tmpl-video-promo', 'videos', 'Product Demo Video', 'Short promotional product demonstration videos', 'kie-video-gen-v1', '{"duration": 15, "style": "professional"}'::jsonb, 'Create a professional product demonstration video with smooth transitions and clear product showcase', 'https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?w=400&h=400&fit=crop', 90, true),
('tmpl-video-social', 'videos', 'Social Media Video', 'Short-form social media video content', 'kie-video-gen-v1', '{"duration": 10, "style": "engaging"}'::jsonb, 'Create an engaging short-form video optimized for social media with dynamic pacing and visual interest', 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&h=400&fit=crop', 100, true),

-- Text Templates
('tmpl-text-blog', 'text', 'Blog Post', 'SEO-optimized blog post content', 'kie-text-gen-v1', '{"format": "blog", "seo": true}'::jsonb, 'Generate a well-structured, SEO-optimized blog post with clear sections and engaging content', 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=400&h=400&fit=crop', 110, true),
('tmpl-text-product', 'text', 'Product Description', 'Compelling product descriptions', 'kie-text-gen-v1', '{"format": "product", "persuasive": true}'::jsonb, 'Create a compelling product description highlighting key features, benefits, and unique selling points', 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=400&fit=crop', 120, true),

-- Audio Templates
('tmpl-audio-music', 'audio', 'Background Music', 'AI-generated background music', 'kie-audio-gen-v1', '{"type": "instrumental", "mood": "upbeat"}'::jsonb, 'Generate upbeat instrumental background music suitable for videos and presentations', 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&h=400&fit=crop', 130, true),
('tmpl-audio-voiceover', 'audio', 'AI Voiceover', 'Natural-sounding AI voiceovers', 'kie-audio-gen-v1', '{"type": "voice", "natural": true}'::jsonb, 'Generate a natural-sounding voiceover with clear pronunciation and appropriate pacing', 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=400&h=400&fit=crop', 140, true);