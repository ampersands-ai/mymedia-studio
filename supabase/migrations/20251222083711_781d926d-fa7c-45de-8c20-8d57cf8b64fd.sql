-- Update user_content_history view to normalize video_editor_jobs status
DROP VIEW IF EXISTS user_content_history;

CREATE OR REPLACE VIEW user_content_history 
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
    NULL::uuid AS video_job_id,
    NULL::uuid AS storyboard_id,
    NULL::uuid AS video_editor_job_id,
    g.enhanced_prompt,
    g.ai_caption,
    g.ai_hashtags,
    'generation'::text AS source_table,
    g.model_id,
    g.model_record_id,
    g.completed_at,
    g.settings
FROM generations g
WHERE g.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)

UNION ALL

SELECT 
    v.id,
    v.user_id,
    'video'::text AS type,
    v.topic AS prompt,
    v.final_video_url AS output_url,
    v.storage_path,
    v.status,
    v.cost_tokens AS tokens_used,
    v.created_at,
    v.caption_generated_at,
    NULL::jsonb AS provider_response,
    NULL::uuid AS parent_generation_id,
    NULL::integer AS output_index,
    false AS is_batch_output,
    NULL::uuid AS workflow_execution_id,
    v.id AS video_job_id,
    NULL::uuid AS storyboard_id,
    NULL::uuid AS video_editor_job_id,
    NULL::text AS enhanced_prompt,
    v.ai_caption,
    v.ai_hashtags,
    'video_job'::text AS source_table,
    NULL::text AS model_id,
    NULL::uuid AS model_record_id,
    v.completed_at,
    NULL::jsonb AS settings
FROM video_jobs v
WHERE v.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)

UNION ALL

SELECT 
    s.id,
    s.user_id,
    'storyboard'::text AS type,
    s.topic AS prompt,
    s.video_url AS output_url,
    s.video_storage_path AS storage_path,
    s.status,
    s.tokens_cost AS tokens_used,
    s.created_at,
    NULL::timestamp with time zone AS caption_generated_at,
    NULL::jsonb AS provider_response,
    NULL::uuid AS parent_generation_id,
    NULL::integer AS output_index,
    false AS is_batch_output,
    NULL::uuid AS workflow_execution_id,
    NULL::uuid AS video_job_id,
    s.id AS storyboard_id,
    NULL::uuid AS video_editor_job_id,
    NULL::text AS enhanced_prompt,
    NULL::text AS ai_caption,
    NULL::text[] AS ai_hashtags,
    'storyboard'::text AS source_table,
    NULL::text AS model_id,
    NULL::uuid AS model_record_id,
    s.completed_at,
    NULL::jsonb AS settings
FROM storyboards s
WHERE s.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)

UNION ALL

SELECT 
    ve.id,
    ve.user_id,
    'video_editor'::text AS type,
    'Video Editor Project'::text AS prompt,
    ve.final_video_url AS output_url,
    NULL::text AS storage_path,
    -- Normalize status: 'done' -> 'completed', 'queued'/'rendering' -> 'processing'
    CASE 
        WHEN ve.status = 'done' THEN 'completed'
        WHEN ve.status IN ('queued', 'rendering') THEN 'processing'
        ELSE ve.status 
    END AS status,
    COALESCE(ve.cost_credits, 0)::integer AS tokens_used,
    ve.created_at,
    NULL::timestamp with time zone AS caption_generated_at,
    NULL::jsonb AS provider_response,
    NULL::uuid AS parent_generation_id,
    NULL::integer AS output_index,
    false AS is_batch_output,
    NULL::uuid AS workflow_execution_id,
    NULL::uuid AS video_job_id,
    NULL::uuid AS storyboard_id,
    ve.id AS video_editor_job_id,
    NULL::text AS enhanced_prompt,
    NULL::text AS ai_caption,
    NULL::text[] AS ai_hashtags,
    'video_editor_job'::text AS source_table,
    NULL::text AS model_id,
    NULL::uuid AS model_record_id,
    ve.updated_at AS completed_at,
    ve.output_settings AS settings
FROM video_editor_jobs ve
WHERE ve.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role);

-- Grant access to authenticated users
GRANT SELECT ON user_content_history TO authenticated;

-- Add security comment
COMMENT ON VIEW user_content_history IS 
'Security: SECURITY INVOKER view. Users see only their own content including video editor jobs. Admins see all.';