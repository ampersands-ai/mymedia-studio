-- Fix Security Definer Views by using SECURITY INVOKER
-- These views should use the permissions of the querying user

-- Recreate template_landing_pages_public with SECURITY INVOKER
DROP VIEW IF EXISTS public.template_landing_pages_public;

CREATE VIEW public.template_landing_pages_public
WITH (security_invoker = true)
AS
SELECT 
  id, slug, category_slug, title, subtitle, long_description,
  meta_title, meta_description, keywords, schema_markup,
  hero_before_image, hero_after_image, example_images,
  demo_video_url, thumbnail_url, steps, use_cases,
  target_audience, tutorial_content, tips, faqs,
  workflow_id, default_settings, related_template_ids,
  is_published, published_at, created_at, updated_at
FROM template_landing_pages
WHERE is_published = true;

GRANT SELECT ON public.template_landing_pages_public TO anon, authenticated;

-- Recreate cinematic_prompts_public with SECURITY INVOKER
DROP VIEW IF EXISTS public.cinematic_prompts_public;

CREATE VIEW public.cinematic_prompts_public
WITH (security_invoker = true)
AS
SELECT 
  id, category, prompt, tags, is_active, created_at
FROM cinematic_prompts
WHERE is_active = true
ORDER BY quality_score DESC NULLS LAST;

GRANT SELECT ON public.cinematic_prompts_public TO anon, authenticated;