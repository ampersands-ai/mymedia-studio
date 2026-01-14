-- Drop the view first then recreate
DROP VIEW IF EXISTS public.user_content_history;

CREATE VIEW public.user_content_history
WITH (security_invoker = on)
AS
-- Generations table
SELECT 
    g.id,
    g.type,
    g.prompt,
    g.output_url,
    g.status,
    g.created_at,
    g.completed_at,
    g.model_id,
    g.model_record_id,
    g.tokens_used,
    g.user_id,
    g.storage_path,
    g.enhanced_prompt,
    g.ai_caption,
    g.ai_hashtags,
    g.caption_generated_at,
    g.settings,
    'generation'::text AS source_table,
    NULL::uuid AS video_job_id,
    NULL::uuid AS storyboard_id,
    NULL::uuid AS video_editor_job_id
FROM generations g
WHERE (g.user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)

UNION ALL

-- Video jobs table
SELECT 
    vj.id,
    'video'::text AS type,
    vj.topic AS prompt,
    vj.final_video_url AS output_url,
    vj.status,
    vj.created_at,
    vj.completed_at,
    NULL::text AS model_id,
    NULL::uuid AS model_record_id,
    vj.cost_tokens AS tokens_used,
    vj.user_id,
    vj.storage_path,
    NULL::text AS enhanced_prompt,
    vj.ai_caption,
    vj.ai_hashtags,
    vj.caption_generated_at,
    NULL::jsonb AS settings,
    'video_job'::text AS source_table,
    vj.id AS video_job_id,
    NULL::uuid AS storyboard_id,
    NULL::uuid AS video_editor_job_id
FROM video_jobs vj
WHERE (vj.user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)

UNION ALL

-- Blackboard storyboards (final rendered videos)
SELECT 
    bs.id,
    'video'::text AS type,
    'Storyboard Video'::text AS prompt,
    bs.final_video_url AS output_url,
    CASE 
        WHEN bs.status = 'complete' THEN 'completed'
        WHEN bs.status = 'failed' THEN 'failed'
        WHEN bs.status IN ('rendering', 'processing') THEN 'processing'
        ELSE bs.status
    END AS status,
    bs.created_at,
    CASE WHEN bs.status = 'complete' THEN bs.updated_at ELSE NULL END AS completed_at,
    NULL::text AS model_id,
    NULL::uuid AS model_record_id,
    COALESCE(bs.estimated_render_cost, 0)::integer AS tokens_used,
    bs.user_id,
    NULL::text AS storage_path,
    NULL::text AS enhanced_prompt,
    NULL::text AS ai_caption,
    NULL::text[] AS ai_hashtags,
    NULL::timestamp with time zone AS caption_generated_at,
    jsonb_build_object('aspect_ratio', bs.aspect_ratio, 'video_model_type', bs.video_model_type) AS settings,
    'storyboard'::text AS source_table,
    NULL::uuid AS video_job_id,
    bs.id AS storyboard_id,
    NULL::uuid AS video_editor_job_id
FROM blackboard_storyboards bs
WHERE bs.final_video_url IS NOT NULL 
  AND ((bs.user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))

UNION ALL

-- Video editor jobs
SELECT 
    vej.id,
    'video'::text AS type,
    'Video Editor Project'::text AS prompt,
    vej.final_video_url AS output_url,
    CASE 
        WHEN vej.status = 'done' THEN 'completed'
        WHEN vej.status = 'failed' THEN 'failed'
        WHEN vej.status IN ('queued', 'fetching', 'rendering', 'saving') THEN 'processing'
        ELSE vej.status
    END AS status,
    vej.created_at,
    CASE WHEN vej.status = 'done' THEN vej.updated_at ELSE NULL END AS completed_at,
    NULL::text AS model_id,
    NULL::uuid AS model_record_id,
    COALESCE(vej.cost_credits, 0)::integer AS tokens_used,
    vej.user_id,
    NULL::text AS storage_path,
    NULL::text AS enhanced_prompt,
    NULL::text AS ai_caption,
    NULL::text[] AS ai_hashtags,
    NULL::timestamp with time zone AS caption_generated_at,
    vej.output_settings AS settings,
    'video_editor_job'::text AS source_table,
    NULL::uuid AS video_job_id,
    NULL::uuid AS storyboard_id,
    vej.id AS video_editor_job_id
FROM video_editor_jobs vej
WHERE (vej.user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role);

-- Grant access to authenticated users
GRANT SELECT ON public.user_content_history TO authenticated;