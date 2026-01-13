-- Add input_url and input_type columns to model_samples table
ALTER TABLE model_samples 
ADD COLUMN input_url text,
ADD COLUMN input_type text DEFAULT 'image';

COMMENT ON COLUMN model_samples.input_url IS 'URL of the input media (image/video) for comparison samples';
COMMENT ON COLUMN model_samples.input_type IS 'Type of input media: image, video';