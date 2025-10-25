-- Create template categories table
CREATE TABLE IF NOT EXISTS public.template_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  meta_title TEXT,
  meta_description TEXT,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create template landing pages table
CREATE TABLE IF NOT EXISTS public.template_landing_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL,
  category_slug TEXT NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  long_description TEXT,
  meta_title TEXT NOT NULL,
  meta_description TEXT NOT NULL,
  keywords TEXT[],
  schema_markup JSONB,
  hero_before_image TEXT,
  hero_after_image TEXT,
  example_images JSONB DEFAULT '[]'::jsonb,
  demo_video_url TEXT,
  thumbnail_url TEXT,
  steps JSONB DEFAULT '[]'::jsonb,
  use_cases JSONB DEFAULT '[]'::jsonb,
  target_audience TEXT[],
  tutorial_content TEXT,
  tips JSONB DEFAULT '[]'::jsonb,
  faqs JSONB DEFAULT '[]'::jsonb,
  workflow_id TEXT,
  default_settings JSONB DEFAULT '{}'::jsonb,
  token_cost INTEGER,
  related_template_ids TEXT[],
  view_count INTEGER NOT NULL DEFAULT 0,
  use_count INTEGER NOT NULL DEFAULT 0,
  conversion_rate NUMERIC(5,2),
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(category_slug, slug),
  CONSTRAINT fk_category FOREIGN KEY (category_slug) REFERENCES public.template_categories(slug) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.template_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_landing_pages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for template_categories
CREATE POLICY "Anyone can view visible categories"
  ON public.template_categories
  FOR SELECT
  USING (is_visible = true);

CREATE POLICY "Admins can manage categories"
  ON public.template_categories
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for template_landing_pages
CREATE POLICY "Anyone can view published templates"
  ON public.template_landing_pages
  FOR SELECT
  USING (is_published = true);

CREATE POLICY "Admins can view all templates"
  ON public.template_landing_pages
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage templates"
  ON public.template_landing_pages
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for better performance
CREATE INDEX idx_template_categories_slug ON public.template_categories(slug);
CREATE INDEX idx_template_categories_visible ON public.template_categories(is_visible);
CREATE INDEX idx_template_landing_pages_category_slug ON public.template_landing_pages(category_slug);
CREATE INDEX idx_template_landing_pages_slug ON public.template_landing_pages(slug);
CREATE INDEX idx_template_landing_pages_published ON public.template_landing_pages(is_published);
CREATE INDEX idx_template_landing_pages_view_count ON public.template_landing_pages(view_count DESC);

-- Add trigger for updated_at
CREATE TRIGGER update_template_landing_pages_updated_at
  BEFORE UPDATE ON public.template_landing_pages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Insert seed categories
INSERT INTO public.template_categories (slug, name, description, icon, color, sort_order, meta_title, meta_description) VALUES
  ('ai-image', 'AI Image Generation', 'Create stunning images with AI', '🎨', '#FF6B6B', 1, 'AI Image Generation Templates', 'Browse our collection of AI image generation templates'),
  ('photo-editing', 'Photo Editing', 'Professional photo editing tools', '📸', '#4ECDC4', 2, 'Photo Editing Templates', 'Transform your photos with AI-powered editing'),
  ('text-to-image', 'Text to Image', 'Convert text descriptions to images', '✨', '#95E1D3', 3, 'Text to Image Templates', 'Generate images from text descriptions'),
  ('video-generation', 'Video Generation', 'AI-powered video creation', '🎬', '#F38181', 4, 'Video Generation Templates', 'Create videos with AI assistance');
