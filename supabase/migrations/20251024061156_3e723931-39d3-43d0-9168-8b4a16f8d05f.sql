-- Insert workflow templates for faceless video creation
INSERT INTO workflow_templates (
  id,
  name,
  description,
  category,
  thumbnail_url,
  is_active,
  display_order,
  estimated_time_seconds,
  workflow_steps,
  user_input_fields
) VALUES 
(
  'faceless-video-educational',
  'Educational Faceless Video',
  'Create engaging educational videos with AI-generated scripts, natural voiceovers, and dynamic visuals',
  'video',
  NULL,
  true,
  100,
  240,
  '[
    {
      "step_number": 1,
      "step_name": "Generate Video",
      "model_id": "faceless-video",
      "prompt_template": "{{topic}}",
      "parameters": {
        "video_style": "{{video_style}}",
        "voice_id": "{{voice_id}}",
        "duration": "{{duration}}"
      },
      "input_mappings": {},
      "output_key": "video"
    }
  ]'::jsonb,
  '[
    {
      "name": "topic",
      "type": "text",
      "label": "Video Topic",
      "required": true
    },
    {
      "name": "video_style",
      "type": "select",
      "label": "Video Style",
      "required": true,
      "options": ["educational", "motivational", "documentary", "tutorial"]
    },
    {
      "name": "voice_id",
      "type": "select",
      "label": "Voice Style",
      "required": true,
      "options": ["professional", "friendly", "energetic", "calm"]
    },
    {
      "name": "duration",
      "type": "select",
      "label": "Video Duration",
      "required": true,
      "options": ["30", "60", "90", "120"]
    }
  ]'::jsonb
),
(
  'faceless-video-social',
  'Social Media Faceless Video',
  'Create viral-ready short videos optimized for TikTok, Instagram Reels, and YouTube Shorts',
  'video',
  NULL,
  true,
  101,
  180,
  '[
    {
      "step_number": 1,
      "step_name": "Generate Video",
      "model_id": "faceless-video",
      "prompt_template": "{{topic}}",
      "parameters": {
        "video_style": "social",
        "voice_id": "{{voice_id}}",
        "duration": "{{duration}}"
      },
      "input_mappings": {},
      "output_key": "video"
    }
  ]'::jsonb,
  '[
    {
      "name": "topic",
      "type": "text",
      "label": "Video Topic",
      "required": true
    },
    {
      "name": "voice_id",
      "type": "select",
      "label": "Voice Style",
      "required": true,
      "options": ["energetic", "friendly", "dramatic", "storyteller"]
    },
    {
      "name": "duration",
      "type": "select",
      "label": "Video Duration",
      "required": true,
      "options": ["15", "30", "60"]
    }
  ]'::jsonb
),
(
  'faceless-video-story',
  'Story-Time Faceless Video',
  'Create compelling story-based videos perfect for storytelling channels and narrative content',
  'video',
  NULL,
  true,
  102,
  300,
  '[
    {
      "step_number": 1,
      "step_name": "Generate Video",
      "model_id": "faceless-video",
      "prompt_template": "{{topic}}",
      "parameters": {
        "video_style": "documentary",
        "voice_id": "{{voice_id}}",
        "duration": "{{duration}}"
      },
      "input_mappings": {},
      "output_key": "video"
    }
  ]'::jsonb,
  '[
    {
      "name": "topic",
      "type": "text",
      "label": "Story Topic",
      "required": true
    },
    {
      "name": "voice_id",
      "type": "select",
      "label": "Narrator Voice",
      "required": true,
      "options": ["storyteller", "dramatic", "calm", "mysterious"]
    },
    {
      "name": "duration",
      "type": "select",
      "label": "Video Duration",
      "required": true,
      "options": ["60", "90", "120", "180"]
    }
  ]'::jsonb
);