-- Fix security definer view warnings by explicitly setting security_invoker
-- Also fix storyboards column names

-- Update user_content_history view to use security_invoker with correct column names
DROP VIEW IF EXISTS public.user_content_history;

CREATE VIEW public.user_content_history 
WITH (security_invoker = true) AS
SELECT 
  g.id,
  g.user_id,
  g.type,
  g.prompt,
  g.output_url,
  g.storage_path,
  g.status,
  g.tokens_used,
  g.created_at,
  g.caption_generated_at,
  g.provider_response,
  g.parent_generation_id,
  g.output_index,
  g.is_batch_output,
  g.workflow_execution_id,
  NULL::uuid as video_job_id,
  NULL::uuid as storyboard_id,
  g.enhanced_prompt,
  g.ai_caption,
  g.ai_hashtags,
  'generations' as source_table
FROM generations g
WHERE g.user_id = auth.uid()

UNION ALL

SELECT 
  v.id,
  v.user_id,
  'video' as type,
  v.topic as prompt,
  v.final_video_url as output_url,
  v.storage_path,
  v.status,
  v.cost_tokens as tokens_used,
  v.created_at,
  v.caption_generated_at,
  NULL::jsonb as provider_response,
  NULL::uuid as parent_generation_id,
  NULL::integer as output_index,
  false as is_batch_output,
  NULL::uuid as workflow_execution_id,
  v.id as video_job_id,
  NULL::uuid as storyboard_id,
  NULL::text as enhanced_prompt,
  v.ai_caption,
  v.ai_hashtags,
  'video_jobs' as source_table
FROM video_jobs v
WHERE v.user_id = auth.uid()

UNION ALL

SELECT 
  s.id,
  s.user_id,
  'storyboard' as type,
  s.topic as prompt,
  s.video_url as output_url,
  s.video_storage_path as storage_path,
  s.status,
  s.tokens_cost as tokens_used,
  s.created_at,
  NULL::timestamp with time zone as caption_generated_at,
  NULL::jsonb as provider_response,
  NULL::uuid as parent_generation_id,
  NULL::integer as output_index,
  false as is_batch_output,
  NULL::uuid as workflow_execution_id,
  NULL::uuid as video_job_id,
  s.id as storyboard_id,
  NULL::text as enhanced_prompt,
  NULL::text as ai_caption,
  NULL::text[] as ai_hashtags,
  'storyboards' as source_table
FROM storyboards s
WHERE s.user_id = auth.uid();

-- Update community_creations_public view to use security_invoker
DROP VIEW IF EXISTS public.community_creations_public;

CREATE VIEW public.community_creations_public
WITH (security_invoker = true) AS
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
  NULL::uuid as user_id
FROM public.community_creations;

-- Update template_landing_pages_public view to use security_invoker
DROP VIEW IF EXISTS public.template_landing_pages_public;

CREATE VIEW public.template_landing_pages_public
WITH (security_invoker = true) AS
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
FROM public.template_landing_pages
WHERE is_published = true;

-- Re-grant permissions
GRANT SELECT ON public.user_content_history TO authenticated;
GRANT SELECT ON public.community_creations_public TO anon, authenticated;
GRANT SELECT ON public.template_landing_pages_public TO anon, authenticated;