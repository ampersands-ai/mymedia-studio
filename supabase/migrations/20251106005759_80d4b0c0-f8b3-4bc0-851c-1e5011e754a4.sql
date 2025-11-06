-- Phase 1: Security Hardening - Sanitized Public Views

-- 1. Create sanitized view for community_creations (exclude user_id, sensitive parameters)
CREATE OR REPLACE VIEW public.community_creations_public AS
SELECT 
  id,
  generation_id,
  model_id,
  model_record_id,
  prompt,
  output_url,
  content_type,
  is_featured,
  views_count,
  likes_count,
  shared_at,
  created_at,
  -- Exclude: user_id, parameters (may contain sensitive config)
  NULL::uuid as user_id -- Return NULL for public view
FROM public.community_creations;

-- Grant access to anonymous users for the public view
GRANT SELECT ON public.community_creations_public TO anon;
GRANT SELECT ON public.community_creations_public TO authenticated;

-- 2. Create sanitized view for template_landing_pages (exclude analytics)
CREATE OR REPLACE VIEW public.template_landing_pages_public AS
SELECT 
  id,
  slug,
  category_slug,
  title,
  subtitle,
  long_description,
  meta_title,
  meta_description,
  keywords,
  schema_markup,
  example_images,
  steps,
  use_cases,
  tips,
  faqs,
  default_settings,
  token_cost,
  is_published,
  published_at,
  created_at,
  updated_at,
  hero_before_image,
  hero_after_image,
  demo_video_url,
  thumbnail_url,
  target_audience,
  tutorial_content,
  workflow_id,
  related_template_ids
  -- Exclude: view_count, use_count, conversion_rate (business intelligence)
FROM public.template_landing_pages
WHERE is_published = true;

-- Grant access to anonymous users for template public view
GRANT SELECT ON public.template_landing_pages_public TO anon;
GRANT SELECT ON public.template_landing_pages_public TO authenticated;

-- 3. Update azure_voices RLS policy to require authentication
DROP POLICY IF EXISTS "Anyone can view active voices" ON public.azure_voices;

CREATE POLICY "Authenticated users can view active voices"
ON public.azure_voices
FOR SELECT
TO authenticated
USING (is_active = true);

-- 4. Keep full community_creations access for authenticated users (no changes)
-- Existing policies remain for authenticated users to access full table

-- 5. Add comment for documentation
COMMENT ON VIEW public.community_creations_public IS 'Sanitized public view of community creations - excludes user_id and sensitive parameters';
COMMENT ON VIEW public.template_landing_pages_public IS 'Sanitized public view of template landing pages - excludes analytics data (view_count, use_count, conversion_rate)';