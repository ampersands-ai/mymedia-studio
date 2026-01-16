-- Add display_provider and hidden_content_types columns to model_pages
ALTER TABLE model_pages 
ADD COLUMN IF NOT EXISTS display_provider TEXT,
ADD COLUMN IF NOT EXISTS hidden_content_types TEXT[] DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN model_pages.display_provider IS 'Custom provider display name (overrides default mapping)';
COMMENT ON COLUMN model_pages.hidden_content_types IS 'Array of content types to hide from public display';