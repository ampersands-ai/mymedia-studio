-- Create AI Models Configuration Table
CREATE TABLE public.ai_models (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  model_name TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('image', 'video', 'audio', 'text')),
  base_token_cost INTEGER NOT NULL CHECK (base_token_cost >= 0),
  cost_multipliers JSONB DEFAULT '{}'::jsonb,
  input_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
  api_endpoint TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on ai_models
ALTER TABLE public.ai_models ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_models
CREATE POLICY "Admins can manage all models" ON public.ai_models
FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view active models" ON public.ai_models
FOR SELECT USING (is_active = true);

-- Create Content Templates Table
CREATE TABLE public.content_templates (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  model_id TEXT REFERENCES public.ai_models(id) ON DELETE SET NULL,
  preset_parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
  enhancement_instruction TEXT,
  thumbnail_url TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on content_templates
ALTER TABLE public.content_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for content_templates
CREATE POLICY "Admins can manage all templates" ON public.content_templates
FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view active templates" ON public.content_templates
FOR SELECT USING (is_active = true);

-- Update generations table with new columns
ALTER TABLE public.generations 
ADD COLUMN IF NOT EXISTS model_id TEXT REFERENCES public.ai_models(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS template_id TEXT REFERENCES public.content_templates(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS original_prompt TEXT,
ADD COLUMN IF NOT EXISTS enhanced_prompt TEXT,
ADD COLUMN IF NOT EXISTS enhancement_provider TEXT,
ADD COLUMN IF NOT EXISTS provider_request JSONB,
ADD COLUMN IF NOT EXISTS provider_response JSONB,
ADD COLUMN IF NOT EXISTS storage_path TEXT,
ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT,
ADD COLUMN IF NOT EXISTS actual_token_cost INTEGER;

-- Create storage bucket for generated content
INSERT INTO storage.buckets (id, name, public)
VALUES ('generated-content', 'generated-content', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for storage bucket
CREATE POLICY "Users can view own content" ON storage.objects
FOR SELECT USING (
  bucket_id = 'generated-content' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Service role can insert content" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'generated-content' AND 
  auth.role() = 'service_role'
);

CREATE POLICY "Users can delete own content" ON storage.objects
FOR DELETE USING (
  bucket_id = 'generated-content' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Create trigger for updated_at on ai_models
CREATE TRIGGER update_ai_models_updated_at
BEFORE UPDATE ON public.ai_models
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Create trigger for updated_at on content_templates
CREATE TRIGGER update_content_templates_updated_at
BEFORE UPDATE ON public.content_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();