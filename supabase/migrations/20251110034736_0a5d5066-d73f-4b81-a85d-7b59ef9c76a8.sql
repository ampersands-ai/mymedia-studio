-- Add default_outputs column to ai_models table
ALTER TABLE ai_models 
ADD COLUMN default_outputs integer DEFAULT 1;

COMMENT ON COLUMN ai_models.default_outputs IS 
'Default number of outputs this model generates per request (e.g., 1 image, 4 images)';