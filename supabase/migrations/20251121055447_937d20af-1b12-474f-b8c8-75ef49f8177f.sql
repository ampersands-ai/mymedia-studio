-- Drop existing content_type constraint
ALTER TABLE ai_models DROP CONSTRAINT IF EXISTS ai_models_content_type_check;

-- Add new constraint with expanded content types
ALTER TABLE ai_models ADD CONSTRAINT ai_models_content_type_check 
CHECK (content_type IN (
  'prompt_to_image',
  'prompt_to_video', 
  'prompt_to_audio',
  'image_to_image',
  'image_to_video',
  'image_editing',
  'text_to_image',
  'text_to_video',
  'text_to_audio',
  -- Keep legacy values for backward compatibility
  'image',
  'video',
  'audio'
));