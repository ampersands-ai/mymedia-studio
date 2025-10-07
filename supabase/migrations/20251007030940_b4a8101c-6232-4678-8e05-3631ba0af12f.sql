-- Add new columns to content_templates for parameter configuration
ALTER TABLE public.content_templates
ADD COLUMN IF NOT EXISTS user_editable_fields jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS hidden_field_defaults jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS is_custom_model boolean DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.content_templates.user_editable_fields IS 'Array of field names from input_schema that users can edit';
COMMENT ON COLUMN public.content_templates.hidden_field_defaults IS 'Default values for hidden fields that will be auto-populated';
COMMENT ON COLUMN public.content_templates.is_custom_model IS 'Whether this template uses a custom model not in ai_models table';