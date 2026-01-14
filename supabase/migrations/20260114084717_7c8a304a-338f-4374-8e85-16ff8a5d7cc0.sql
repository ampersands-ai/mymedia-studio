-- Fix user_content_history view to include all required columns with correct mappings
DROP VIEW IF EXISTS public.user_content_history;
CREATE VIEW public.user_content_history
WITH (security_invoker=on) AS
SELECT 
  g.id,
  g.type,
  g.prompt,
  g.output_url,
  g.status,
  g.created_at,
  g.completed_at,
  g.model_id,
  g.tokens_used,
  g.user_id,
  g.storage_path,
  g.enhanced_prompt,
  g.ai_caption,
  g.ai_hashtags,
  g.caption_generated_at,
  'generations'::text as source_table,
  NULL::uuid as video_job_id
FROM generations g
WHERE g.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role)
UNION ALL
SELECT
  vj.id,
  'video'::text as type,
  vj.topic as prompt,
  vj.final_video_url as output_url,
  vj.status,
  vj.created_at,
  vj.completed_at,
  NULL::text as model_id,
  vj.cost_tokens as tokens_used,
  vj.user_id,
  vj.storage_path,
  NULL::text as enhanced_prompt,
  vj.ai_caption,
  vj.ai_hashtags,
  vj.caption_generated_at,
  'video_jobs'::text as source_table,
  vj.id as video_job_id
FROM video_jobs vj
WHERE vj.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role);