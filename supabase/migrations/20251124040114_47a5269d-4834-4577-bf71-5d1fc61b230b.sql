-- Phase 4: Critical RLS Fixes for Views (user_content_history and user_available_credits)

-- ============================================================================
-- 1. Fix user_content_history view - Add admin access
-- ============================================================================
-- Current view already filters by auth.uid() which is good
-- We just need to add admin access using OR condition

CREATE OR REPLACE VIEW user_content_history AS
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
    g.enhanced_prompt,
    g.ai_caption,
    g.ai_hashtags,
    'generations'::text AS source_table
FROM generations g
WHERE g.user_id = auth.uid() OR has_role(auth.uid(), 'admin')

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
    NULL::text AS enhanced_prompt,
    v.ai_caption,
    v.ai_hashtags,
    'video_jobs'::text AS source_table
FROM video_jobs v
WHERE v.user_id = auth.uid() OR has_role(auth.uid(), 'admin')

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
    NULL::text AS enhanced_prompt,
    NULL::text AS ai_caption,
    NULL::text[] AS ai_hashtags,
    'storyboards'::text AS source_table
FROM storyboards s
WHERE s.user_id = auth.uid() OR has_role(auth.uid(), 'admin');

-- Add security comment
COMMENT ON VIEW user_content_history IS 
'Security: Users can only see their own content history (prompts, outputs, storage paths). Admins can see all records.';

-- ============================================================================
-- 2. Fix user_available_credits view - ADD CRITICAL SECURITY FILTER
-- ============================================================================
-- CRITICAL: This view currently has NO filtering - anyone can see all users' credits!

CREATE OR REPLACE VIEW user_available_credits AS
SELECT 
    us.user_id,
    us.tokens_remaining AS total_credits,
    COALESCE(SUM(g.tokens_used - g.tokens_charged), 0) AS reserved_credits,
    us.tokens_remaining - COALESCE(SUM(g.tokens_used - g.tokens_charged), 0) AS available_credits
FROM user_subscriptions us
LEFT JOIN generations g 
    ON us.user_id = g.user_id 
    AND g.status IN ('pending', 'processing')
    AND g.tokens_charged < g.tokens_used
WHERE us.user_id = auth.uid() OR has_role(auth.uid(), 'admin')
GROUP BY us.user_id, us.tokens_remaining;

-- Add security comment
COMMENT ON VIEW user_available_credits IS 
'Security fix: Users can only see their own credit balance. Admins can see all balances. CRITICAL: Previously had no filtering!';