-- Insert feature flags setting
INSERT INTO app_settings (setting_key, setting_value)
VALUES ('feature_flags', '{
  "templates": {
    "enabled": true,
    "all_enabled": true
  },
  "custom_creation": {
    "enabled": true,
    "groups": {
      "image_editing": true,
      "prompt_to_image": true,
      "prompt_to_video": true,
      "image_to_video": true,
      "video_to_video": true,
      "lip_sync": true,
      "prompt_to_audio": true
    }
  },
  "faceless_videos": {
    "enabled": true
  },
  "storyboard": {
    "enabled": true
  }
}'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;