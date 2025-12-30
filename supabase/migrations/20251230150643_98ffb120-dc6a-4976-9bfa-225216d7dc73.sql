-- PHASE 1: SECURITY FIXES - Fix user_consent_records RLS policies
DROP POLICY IF EXISTS "Users can view their own consent records" ON user_consent_records;
DROP POLICY IF EXISTS "Users can insert their own consent records" ON user_consent_records;
DROP POLICY IF EXISTS "Users can update their own consent records" ON user_consent_records;
DROP POLICY IF EXISTS "Authenticated users manage own consent" ON user_consent_records;
DROP POLICY IF EXISTS "Anonymous device consent allowed" ON user_consent_records;
DROP POLICY IF EXISTS "Admins manage all consent records" ON user_consent_records;

CREATE POLICY "Authenticated users manage own consent"
  ON user_consent_records FOR ALL
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Anonymous device consent allowed"
  ON user_consent_records FOR ALL
  USING (user_id IS NULL AND device_id IS NOT NULL)
  WITH CHECK (user_id IS NULL AND device_id IS NOT NULL);

CREATE POLICY "Admins manage all consent records"
  ON user_consent_records FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Views
DROP VIEW IF EXISTS public.template_landing_pages_public;
CREATE VIEW public.template_landing_pages_public AS
SELECT id, slug, category_slug, title, subtitle, long_description,
  meta_title, meta_description, keywords, schema_markup,
  hero_before_image, hero_after_image, example_images,
  demo_video_url, thumbnail_url, steps, use_cases,
  target_audience, tutorial_content, tips, faqs,
  workflow_id, default_settings, related_template_ids,
  is_published, published_at, created_at, updated_at
FROM template_landing_pages WHERE is_published = true;
GRANT SELECT ON public.template_landing_pages_public TO anon, authenticated;

DROP VIEW IF EXISTS public.cinematic_prompts_public;
CREATE VIEW public.cinematic_prompts_public AS
SELECT id, category, prompt, tags, is_active, created_at
FROM cinematic_prompts WHERE is_active = true
ORDER BY quality_score DESC NULLS LAST;
GRANT SELECT ON public.cinematic_prompts_public TO anon, authenticated;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_generations_user_status_created
  ON generations(user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_templates_slug_published
  ON template_landing_pages(slug) WHERE is_published = true;