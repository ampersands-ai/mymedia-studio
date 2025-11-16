-- Blog System Tables with Complete SEO Support
-- =============================================

-- 1. Blog Posts Table (Core Content + Full SEO)
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Content Fields
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  excerpt TEXT,
  
  -- SEO Meta Tags
  meta_title TEXT,
  meta_description TEXT,
  meta_keywords TEXT[],
  canonical_url TEXT,
  
  -- Open Graph Tags
  og_title TEXT,
  og_description TEXT,
  og_image_url TEXT,
  
  -- Twitter Card Tags
  twitter_card_type TEXT DEFAULT 'summary_large_image',
  twitter_title TEXT,
  twitter_description TEXT,
  twitter_image_url TEXT,
  
  -- Schema.org Structured Data
  schema_type TEXT DEFAULT 'BlogPosting',
  schema_data JSONB,
  
  -- Publishing Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'scheduled', 'archived')),
  published_at TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ,
  
  -- Analytics
  view_count INTEGER NOT NULL DEFAULT 0,
  share_count INTEGER NOT NULL DEFAULT 0,
  
  -- AI Generation Tracking
  ai_generated BOOLEAN NOT NULL DEFAULT false,
  generation_prompt TEXT,
  topic_prompt TEXT,
  
  -- Reading Time (auto-calculated)
  reading_time INTEGER,
  
  -- Featured Post
  is_featured BOOLEAN NOT NULL DEFAULT false,
  featured_image_url TEXT
);

-- 2. Blog Images Table
CREATE TABLE IF NOT EXISTS public.blog_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  blog_post_id UUID NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  
  image_url TEXT NOT NULL,
  alt_text TEXT NOT NULL,
  title TEXT,
  caption TEXT,
  
  -- AI Generation Info
  model_id TEXT,
  generation_id UUID,
  prompt TEXT,
  
  -- Position in Post
  position INTEGER NOT NULL DEFAULT 0,
  is_featured BOOLEAN NOT NULL DEFAULT false
);

-- 3. Blog Backlinks Table (Internal + External Links)
CREATE TABLE IF NOT EXISTS public.blog_backlinks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  blog_post_id UUID NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  
  url TEXT NOT NULL,
  anchor_text TEXT NOT NULL,
  rel_attribute TEXT DEFAULT 'noopener noreferrer',
  is_internal BOOLEAN NOT NULL DEFAULT false,
  position INTEGER
);

-- 4. Blog Email Distribution Tracking
CREATE TABLE IF NOT EXISTS public.blog_email_distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  blog_post_id UUID NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  recipient_count INTEGER NOT NULL DEFAULT 0,
  open_count INTEGER NOT NULL DEFAULT 0,
  click_count INTEGER NOT NULL DEFAULT 0,
  
  email_service_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed'))
);

-- 5. Blog Categories Table
CREATE TABLE IF NOT EXISTS public.blog_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  meta_description TEXT,
  parent_id UUID REFERENCES public.blog_categories(id) ON DELETE SET NULL
);

-- 6. Blog Tags Table
CREATE TABLE IF NOT EXISTS public.blog_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  meta_description TEXT
);

-- 7. Blog Post Categories Junction Table
CREATE TABLE IF NOT EXISTS public.blog_post_categories (
  blog_post_id UUID NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.blog_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (blog_post_id, category_id)
);

-- 8. Blog Post Tags Junction Table
CREATE TABLE IF NOT EXISTS public.blog_post_tags (
  blog_post_id UUID NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.blog_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (blog_post_id, tag_id)
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON public.blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON public.blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON public.blog_posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_author ON public.blog_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_blog_images_post ON public.blog_images(blog_post_id);
CREATE INDEX IF NOT EXISTS idx_blog_backlinks_post ON public.blog_backlinks(blog_post_id);

-- RLS Policies
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_backlinks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_email_distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_post_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_post_tags ENABLE ROW LEVEL SECURITY;

-- Blog Posts: Public can read published, authors can manage their own
CREATE POLICY "Public can view published blog posts"
  ON public.blog_posts FOR SELECT
  USING (status = 'published' OR auth.uid() = author_id);

CREATE POLICY "Authors can insert their own blog posts"
  ON public.blog_posts FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update their own blog posts"
  ON public.blog_posts FOR UPDATE
  USING (auth.uid() = author_id);

CREATE POLICY "Authors can delete their own blog posts"
  ON public.blog_posts FOR DELETE
  USING (auth.uid() = author_id);

-- Blog Images: Follow parent post permissions
CREATE POLICY "Public can view blog images"
  ON public.blog_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.blog_posts
      WHERE id = blog_images.blog_post_id
      AND (status = 'published' OR author_id = auth.uid())
    )
  );

CREATE POLICY "Authors can manage their blog images"
  ON public.blog_images FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.blog_posts
      WHERE id = blog_images.blog_post_id
      AND author_id = auth.uid()
    )
  );

-- Blog Backlinks: Follow parent post permissions
CREATE POLICY "Public can view blog backlinks"
  ON public.blog_backlinks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.blog_posts
      WHERE id = blog_backlinks.blog_post_id
      AND (status = 'published' OR author_id = auth.uid())
    )
  );

CREATE POLICY "Authors can manage their blog backlinks"
  ON public.blog_backlinks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.blog_posts
      WHERE id = blog_backlinks.blog_post_id
      AND author_id = auth.uid()
    )
  );

-- Email Distributions: Authors can view their own
CREATE POLICY "Authors can view their email distributions"
  ON public.blog_email_distributions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.blog_posts
      WHERE id = blog_email_distributions.blog_post_id
      AND author_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage email distributions"
  ON public.blog_email_distributions FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Categories and Tags: Public read, authenticated write
CREATE POLICY "Public can view categories"
  ON public.blog_categories FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage categories"
  ON public.blog_categories FOR ALL
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Public can view tags"
  ON public.blog_tags FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage tags"
  ON public.blog_tags FOR ALL
  USING (auth.uid() IS NOT NULL);

-- Junction tables: Follow parent permissions
CREATE POLICY "Public can view post categories"
  ON public.blog_post_categories FOR SELECT
  USING (true);

CREATE POLICY "Authors can manage post categories"
  ON public.blog_post_categories FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.blog_posts
      WHERE id = blog_post_categories.blog_post_id
      AND author_id = auth.uid()
    )
  );

CREATE POLICY "Public can view post tags"
  ON public.blog_post_tags FOR SELECT
  USING (true);

CREATE POLICY "Authors can manage post tags"
  ON public.blog_post_tags FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.blog_posts
      WHERE id = blog_post_tags.blog_post_id
      AND author_id = auth.uid()
    )
  );

-- RPC Functions for Analytics
CREATE OR REPLACE FUNCTION public.increment_blog_view_count(post_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.blog_posts
  SET view_count = view_count + 1
  WHERE id = post_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_blog_share_count(post_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.blog_posts
  SET share_count = share_count + 1
  WHERE id = post_id;
END;
$$;

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_blog_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_blog_updated_at();