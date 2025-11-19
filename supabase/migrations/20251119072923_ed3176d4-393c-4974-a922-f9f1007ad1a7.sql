-- Fix Google Veo 3.1 Fast schema (8aac94cb-5625-47f4-880c-4f0fd8bd83a1)
-- Remove imageInputField and update schema to match Veo 3.1 HQ
UPDATE ai_models 
SET input_schema = jsonb_build_object(
  'type', 'object',
  'properties', jsonb_build_object(
    'prompt', jsonb_build_object(
      'type', 'string',
      'renderer', 'prompt',
      'description', 'Describe the motion and style',
      'maxLength', 1000
    ),
    'startFrame', jsonb_build_object(
      'type', 'string',
      'format', 'uri',
      'renderer', 'image',
      'title', 'Start Frame',
      'description', 'First frame for the video generation'
    ),
    'endFrame', jsonb_build_object(
      'type', 'string',
      'format', 'uri',
      'renderer', 'image',
      'title', 'End Frame (Optional)',
      'description', 'Last frame for the video generation (optional)'
    ),
    'aspectRatio', jsonb_build_object(
      'type', 'string',
      'title', 'Aspect Ratio',
      'enum', jsonb_build_array('16:9', '9:16', '1:1'),
      'default', '16:9'
    ),
    'seeds', jsonb_build_object(
      'type', 'number',
      'minimum', 10000,
      'maximum', 99999
    ),
    'model', jsonb_build_object(
      'type', 'string',
      'default', 'veo3_fast',
      'showToUser', false
    ),
    'generationType', jsonb_build_object(
      'type', 'string',
      'default', 'FIRST_AND_LAST_FRAMES_2_VIDEO',
      'showToUser', false
    )
  ),
  'required', jsonb_build_array('prompt', 'startFrame', 'model', 'generationType'),
  'usePromptRenderer', true
)
WHERE record_id = '8aac94cb-5625-47f4-880c-4f0fd8bd83a1';

-- Remove imageInputField from Google Veo 3.1 HQ (a5c2ec16-6294-4588-86b6-7b4182601cda)
-- Keep all existing properties, just remove imageInputField if it exists
UPDATE ai_models 
SET input_schema = input_schema - 'imageInputField'
WHERE record_id = 'a5c2ec16-6294-4588-86b6-7b4182601cda';