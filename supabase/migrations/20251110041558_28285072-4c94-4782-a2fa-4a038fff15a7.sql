-- Add model family and variant columns to ai_models table
ALTER TABLE ai_models 
ADD COLUMN model_family text,
ADD COLUMN variant_name text,
ADD COLUMN display_order_in_family integer DEFAULT 0;

-- Add comments for clarity
COMMENT ON COLUMN ai_models.model_family IS 'Brand/family grouping (e.g., "Google", "FLUX", "OpenAI")';
COMMENT ON COLUMN ai_models.variant_name IS 'Specific variant within family (e.g., "Imagen 4", "Imagen 4 Fast")';
COMMENT ON COLUMN ai_models.display_order_in_family IS 'Sort order within family (lower numbers first)';

-- Create index for faster family queries
CREATE INDEX idx_ai_models_family ON ai_models(model_family, display_order_in_family);

-- Auto-populate model_family and variant_name from existing model_name
UPDATE ai_models
SET 
  model_family = CASE
    WHEN model_name ILIKE 'Google%' THEN 'Google'
    WHEN model_name ILIKE 'FLUX%' THEN 'FLUX'
    WHEN model_name ILIKE 'OpenAI%' OR model_name ILIKE 'DALL-E%' THEN 'OpenAI'
    WHEN model_name ILIKE 'Midjourney%' THEN 'Midjourney'
    WHEN model_name ILIKE 'Stable Diffusion%' THEN 'Stable Diffusion'
    WHEN model_name ILIKE '%Banana%' THEN 'Google'
    ELSE provider
  END,
  variant_name = CASE
    WHEN model_name ILIKE 'Google Imagen 4 Ultra%' THEN 'Imagen 4 Ultra'
    WHEN model_name ILIKE 'Google Imagen 4 Fast%' THEN 'Imagen 4 Fast'
    WHEN model_name ILIKE 'Google Imagen 4%' AND model_name NOT ILIKE '%Fast%' AND model_name NOT ILIKE '%Ultra%' THEN 'Imagen 4'
    WHEN model_name ILIKE '%Nano Banana%' THEN 'Nano Banana (Flash 2.5)'
    WHEN model_name ILIKE 'FLUX.1 Pro%' THEN 'FLUX.1 Pro'
    WHEN model_name ILIKE 'FLUX.1 Dev%' THEN 'FLUX.1 Dev'
    WHEN model_name ILIKE 'FLUX.1 Schnell%' THEN 'FLUX.1 Schnell'
    ELSE model_name
  END,
  display_order_in_family = CASE
    WHEN model_name ILIKE '%Ultra%' OR model_name ILIKE '%Pro%' THEN 3
    WHEN model_name ILIKE '%Fast%' OR model_name ILIKE '%Turbo%' OR model_name ILIKE '%Schnell%' THEN 2
    ELSE 1
  END
WHERE model_family IS NULL;