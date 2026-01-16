-- Add columns to support multiple content types per model page
-- content_type_groups: JSONB array of all content types this model supports
-- model_record_ids: Array of all linked record IDs for syncing with model registry

ALTER TABLE model_pages 
ADD COLUMN IF NOT EXISTS content_type_groups JSONB DEFAULT '[]'::jsonb;

ALTER TABLE model_pages 
ADD COLUMN IF NOT EXISTS model_record_ids TEXT[] DEFAULT '{}';

-- Add index for faster lookups by model_record_ids
CREATE INDEX IF NOT EXISTS idx_model_pages_model_record_ids 
ON model_pages USING GIN(model_record_ids);

-- Add comment for documentation
COMMENT ON COLUMN model_pages.content_type_groups IS 'Array of content type objects: [{content_type, record_id, title, description}]';
COMMENT ON COLUMN model_pages.model_record_ids IS 'Array of all linked model record_ids for status sync';