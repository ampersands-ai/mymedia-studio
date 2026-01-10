-- Model Pages Table
CREATE TABLE model_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  model_record_id TEXT NOT NULL,
  model_name TEXT NOT NULL,
  provider TEXT NOT NULL,
  category TEXT NOT NULL,
  
  -- Content
  tagline TEXT,
  description TEXT,
  highlights JSONB DEFAULT '[]',
  specifications JSONB DEFAULT '{}',
  use_cases JSONB DEFAULT '[]',
  pricing_note TEXT,
  faqs JSONB DEFAULT '[]',
  
  -- SEO
  meta_title TEXT NOT NULL,
  meta_description TEXT NOT NULL,
  keywords TEXT[] DEFAULT '{}',
  og_image_url TEXT,
  
  -- Media
  hero_image_url TEXT,
  hero_video_url TEXT,
  
  -- Status
  is_featured BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for model_pages
CREATE INDEX idx_model_pages_slug ON model_pages(slug);
CREATE INDEX idx_model_pages_published ON model_pages(is_published) WHERE is_published = true;
CREATE INDEX idx_model_pages_category ON model_pages(category);
CREATE INDEX idx_model_pages_featured ON model_pages(is_featured) WHERE is_featured = true;
CREATE INDEX idx_model_pages_model_record ON model_pages(model_record_id);

-- Model Samples Table
CREATE TABLE model_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_page_id UUID NOT NULL REFERENCES model_pages(id) ON DELETE CASCADE,
  
  title TEXT,
  prompt TEXT NOT NULL,
  negative_prompt TEXT,
  output_url TEXT NOT NULL,
  output_type TEXT NOT NULL,
  thumbnail_url TEXT,
  parameters JSONB DEFAULT '{}',
  
  is_featured BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for model_samples
CREATE INDEX idx_model_samples_page ON model_samples(model_page_id);
CREATE INDEX idx_model_samples_featured ON model_samples(model_page_id, is_featured);
CREATE INDEX idx_model_samples_order ON model_samples(model_page_id, display_order);

-- Model Prompt Templates Table
CREATE TABLE model_prompt_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_page_id UUID NOT NULL REFERENCES model_pages(id) ON DELETE CASCADE,
  
  category TEXT,
  title TEXT NOT NULL,
  prompt_template TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for model_prompt_templates
CREATE INDEX idx_model_prompt_templates_page ON model_prompt_templates(model_page_id);

-- Enable RLS on all tables
ALTER TABLE model_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_prompt_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for model_pages
CREATE POLICY "Public read published model pages"
ON model_pages FOR SELECT
USING (is_published = true);

CREATE POLICY "Admin manage model pages"
ON model_pages FOR ALL
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- RLS Policies for model_samples
CREATE POLICY "Public read samples for published pages"
ON model_samples FOR SELECT
USING (EXISTS (
  SELECT 1 FROM model_pages WHERE id = model_samples.model_page_id AND is_published = true
));

CREATE POLICY "Admin manage model samples"
ON model_samples FOR ALL
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- RLS Policies for model_prompt_templates
CREATE POLICY "Public read templates for published pages"
ON model_prompt_templates FOR SELECT
USING (EXISTS (
  SELECT 1 FROM model_pages WHERE id = model_prompt_templates.model_page_id AND is_published = true
));

CREATE POLICY "Admin manage prompt templates"
ON model_prompt_templates FOR ALL
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- RPC function to increment view count
CREATE OR REPLACE FUNCTION increment_model_page_view_count(page_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  UPDATE model_pages SET view_count = view_count + 1 WHERE id = page_id;
END;
$$;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_model_pages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_model_pages_timestamp
BEFORE UPDATE ON model_pages
FOR EACH ROW
EXECUTE FUNCTION update_model_pages_updated_at();