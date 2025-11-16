-- Blog Posts Table with SEO Optimization
CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Author
  author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Content
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL, -- Rich text HTML content
  excerpt TEXT, -- Auto-generated or custom summary

  -- SEO Fields
  meta_title TEXT,
  meta_description TEXT,
  meta_keywords TEXT[], -- Array of keywords
  canonical_url TEXT,
  og_title TEXT, -- Open Graph title
  og_description TEXT,
  og_image_url TEXT,
  twitter_card_type TEXT DEFAULT 'summary_large_image',
  twitter_title TEXT,
  twitter_description TEXT,
  twitter_image_url TEXT,

  -- Schema.org structured data
  schema_type TEXT DEFAULT 'BlogPosting',
  schema_data JSONB,

  -- Publishing
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'scheduled', 'archived')),
  published_at TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ,

  -- Analytics
  view_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,

  -- AI Generation metadata
  ai_generated BOOLEAN DEFAULT false,
  generation_prompt TEXT,
  topic_prompt TEXT,

  -- Reading time (in minutes)
  reading_time INTEGER,

  -- Featured
  is_featured BOOLEAN DEFAULT false,
  featured_image_url TEXT
);

-- Blog Images - For AI-generated images in posts
CREATE TABLE IF NOT EXISTS blog_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),

  blog_post_id UUID REFERENCES blog_posts(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  alt_text TEXT NOT NULL, -- For SEO
  title TEXT, -- Image title for SEO
  caption TEXT,

  -- AI Generation metadata
  model_id TEXT,
  generation_id UUID REFERENCES generations(id) ON DELETE SET NULL,
  prompt TEXT,

  -- Position in blog
  position INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false
);

-- Blog Backlinks - For SEO optimization
CREATE TABLE IF NOT EXISTS blog_backlinks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),

  blog_post_id UUID REFERENCES blog_posts(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  anchor_text TEXT NOT NULL,
  rel_attribute TEXT DEFAULT 'noopener noreferrer', -- e.g., 'nofollow', 'noopener'
  is_internal BOOLEAN DEFAULT false,
  position INTEGER -- Position in content
);

-- Blog Email Distributions - Track email sends
CREATE TABLE IF NOT EXISTS blog_email_distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),

  blog_post_id UUID REFERENCES blog_posts(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ DEFAULT now(),
  recipient_count INTEGER DEFAULT 0,
  open_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,

  -- Email service metadata
  email_service_id TEXT, -- External service tracking ID
  status TEXT DEFAULT 'sent' CHECK (status IN ('pending', 'sent', 'failed'))
);

-- Blog Categories (optional for organization)
CREATE TABLE IF NOT EXISTS blog_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),

  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  meta_description TEXT,
  parent_id UUID REFERENCES blog_categories(id) ON DELETE SET NULL
);

-- Blog Post Categories Junction Table
CREATE TABLE IF NOT EXISTS blog_post_categories (
  blog_post_id UUID REFERENCES blog_posts(id) ON DELETE CASCADE,
  category_id UUID REFERENCES blog_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (blog_post_id, category_id)
);

-- Blog Tags for better organization and SEO
CREATE TABLE IF NOT EXISTS blog_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),

  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  meta_description TEXT
);

-- Blog Post Tags Junction Table
CREATE TABLE IF NOT EXISTS blog_post_tags (
  blog_post_id UUID REFERENCES blog_posts(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES blog_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (blog_post_id, tag_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_blog_posts_author ON blog_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON blog_posts(published_at);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_featured ON blog_posts(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_blog_images_post ON blog_images(blog_post_id);
CREATE INDEX IF NOT EXISTS idx_blog_backlinks_post ON blog_backlinks(blog_post_id);
CREATE INDEX IF NOT EXISTS idx_blog_email_distributions_post ON blog_email_distributions(blog_post_id);

-- Full-text search index for blog content
CREATE INDEX IF NOT EXISTS idx_blog_posts_search ON blog_posts USING gin(to_tsvector('english', title || ' ' || content || ' ' || COALESCE(excerpt, '')));

-- RLS Policies

-- Blog Posts: Public can read published, authenticated users can manage their own
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published blog posts"
  ON blog_posts FOR SELECT
  USING (status = 'published' OR auth.uid() = author_id);

CREATE POLICY "Users can create their own blog posts"
  ON blog_posts FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update their own blog posts"
  ON blog_posts FOR UPDATE
  USING (auth.uid() = author_id);

CREATE POLICY "Users can delete their own blog posts"
  ON blog_posts FOR DELETE
  USING (auth.uid() = author_id);

-- Blog Images: Inherit from blog posts
ALTER TABLE blog_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published blog images"
  ON blog_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM blog_posts
      WHERE blog_posts.id = blog_images.blog_post_id
      AND (blog_posts.status = 'published' OR blog_posts.author_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage images for their blog posts"
  ON blog_images FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM blog_posts
      WHERE blog_posts.id = blog_images.blog_post_id
      AND blog_posts.author_id = auth.uid()
    )
  );

-- Blog Backlinks: Inherit from blog posts
ALTER TABLE blog_backlinks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published blog backlinks"
  ON blog_backlinks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM blog_posts
      WHERE blog_posts.id = blog_backlinks.blog_post_id
      AND (blog_posts.status = 'published' OR blog_posts.author_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage backlinks for their blog posts"
  ON blog_backlinks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM blog_posts
      WHERE blog_posts.id = blog_backlinks.blog_post_id
      AND blog_posts.author_id = auth.uid()
    )
  );

-- Blog Email Distributions: Only owner can view
ALTER TABLE blog_email_distributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view distributions for their blog posts"
  ON blog_email_distributions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM blog_posts
      WHERE blog_posts.id = blog_email_distributions.blog_post_id
      AND blog_posts.author_id = auth.uid()
    )
  );

CREATE POLICY "Users can create distributions for their blog posts"
  ON blog_email_distributions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM blog_posts
      WHERE blog_posts.id = blog_email_distributions.blog_post_id
      AND blog_posts.author_id = auth.uid()
    )
  );

-- Blog Categories: Public read, admin write
ALTER TABLE blog_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view categories"
  ON blog_categories FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage categories"
  ON blog_categories FOR ALL
  USING (auth.uid() IS NOT NULL);

-- Blog Tags: Public read, admin write
ALTER TABLE blog_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view tags"
  ON blog_tags FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage tags"
  ON blog_tags FOR ALL
  USING (auth.uid() IS NOT NULL);

-- Junction tables RLS
ALTER TABLE blog_post_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_post_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view post categories"
  ON blog_post_categories FOR SELECT
  USING (true);

CREATE POLICY "Users can manage categories for their posts"
  ON blog_post_categories FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM blog_posts
      WHERE blog_posts.id = blog_post_categories.blog_post_id
      AND blog_posts.author_id = auth.uid()
    )
  );

CREATE POLICY "Public can view post tags"
  ON blog_post_tags FOR SELECT
  USING (true);

CREATE POLICY "Users can manage tags for their posts"
  ON blog_post_tags FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM blog_posts
      WHERE blog_posts.id = blog_post_tags.blog_post_id
      AND blog_posts.author_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_blog_post_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_blog_posts_updated_at
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_blog_post_updated_at();

-- Function to auto-generate slug from title
CREATE OR REPLACE FUNCTION generate_blog_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := lower(regexp_replace(NEW.title, '[^a-zA-Z0-9]+', '-', 'g'));
    NEW.slug := trim(both '-' from NEW.slug);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_blog_posts_slug
  BEFORE INSERT OR UPDATE ON blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION generate_blog_slug();

-- Function to calculate reading time (average 200 words per minute)
CREATE OR REPLACE FUNCTION calculate_reading_time()
RETURNS TRIGGER AS $$
BEGIN
  NEW.reading_time := CEIL(array_length(regexp_split_to_array(NEW.content, '\s+'), 1) / 200.0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_blog_reading_time
  BEFORE INSERT OR UPDATE ON blog_posts
  FOR EACH ROW
  WHEN (NEW.content IS NOT NULL)
  EXECUTE FUNCTION calculate_reading_time();
