-- Create a unified view combining generations, video_jobs, and storyboards
CREATE OR REPLACE VIEW user_content_history AS
WITH 
  -- Regular generations
  regular_gens AS (
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
      g.enhanced_prompt,
      g.ai_caption,
      g.ai_hashtags,
      g.caption_generated_at,
      g.provider_response,
      g.parent_generation_id,
      g.output_index,
      g.is_batch_output,
      g.workflow_execution_id,
      'generation' as source_table,
      NULL::uuid as video_job_id,
      NULL::uuid as storyboard_id,
      -- Create a dedup key: use storage_path if available, else id
      COALESCE(
        REGEXP_REPLACE(g.storage_path, '\?.*$', ''), -- Remove query params
        g.id::text
      ) as dedup_key
    FROM generations g
  ),
  
  -- Video jobs
  video_jobs_transformed AS (
    SELECT 
      vj.id,
      vj.user_id,
      'video' as type,
      'Faceless Video: ' || vj.topic as prompt,
      vj.final_video_url as output_url,
      vj.storage_path,
      vj.status,
      vj.cost_tokens as tokens_used,
      vj.created_at,
      NULL as enhanced_prompt,
      vj.ai_caption,
      vj.ai_hashtags,
      vj.caption_generated_at,
      CASE 
        WHEN vj.error_message IS NOT NULL 
        THEN jsonb_build_object('data', jsonb_build_object('failMsg', vj.error_message))
        ELSE NULL
      END as provider_response,
      NULL::uuid as parent_generation_id,
      0 as output_index,
      false as is_batch_output,
      NULL::uuid as workflow_execution_id,
      'video_job' as source_table,
      vj.id as video_job_id,
      NULL::uuid as storyboard_id,
      COALESCE(
        REGEXP_REPLACE(vj.storage_path, '\?.*$', ''),
        vj.id::text
      ) as dedup_key
    FROM video_jobs vj
    WHERE vj.status IN ('completed', 'failed')
  ),
  
  -- Storyboards
  storyboards_transformed AS (
    SELECT 
      sb.id,
      sb.user_id,
      'video' as type,
      'Storyboard: ' || sb.topic as prompt,
      CASE 
        WHEN sb.video_storage_path LIKE 'storyboard-videos/%' 
        THEN sb.video_storage_path 
        ELSE sb.video_url 
      END as output_url,
      CASE 
        WHEN sb.video_storage_path LIKE 'storyboard-videos/%' 
        THEN sb.video_storage_path 
        ELSE NULL 
      END as storage_path,
      CASE 
        WHEN sb.status = 'complete' THEN 'completed'
        ELSE sb.status 
      END as status,
      COALESCE(sb.tokens_cost, sb.estimated_render_cost, 0) as tokens_used,
      sb.created_at,
      NULL as enhanced_prompt,
      NULL as ai_caption,
      NULL::text[] as ai_hashtags,
      NULL::timestamptz as caption_generated_at,
      NULL::jsonb as provider_response,
      NULL::uuid as parent_generation_id,
      0 as output_index,
      false as is_batch_output,
      NULL::uuid as workflow_execution_id,
      'storyboard' as source_table,
      NULL::uuid as video_job_id,
      sb.id as storyboard_id,
      COALESCE(
        REGEXP_REPLACE(sb.video_storage_path, '\?.*$', ''),
        sb.id::text
      ) as dedup_key
    FROM storyboards sb
    WHERE sb.status IN ('complete', 'failed', 'rendering')
  ),
  
  -- Combine all sources
  all_content AS (
    SELECT * FROM regular_gens
    UNION ALL
    SELECT * FROM video_jobs_transformed
    UNION ALL
    SELECT * FROM storyboards_transformed
  ),
  
  -- Deduplicate: prefer video_jobs > storyboards > generations
  deduplicated AS (
    SELECT DISTINCT ON (dedup_key)
      id, user_id, type, prompt, output_url, storage_path, status, 
      tokens_used, created_at, enhanced_prompt, ai_caption, ai_hashtags,
      caption_generated_at, provider_response, parent_generation_id,
      output_index, is_batch_output, workflow_execution_id,
      source_table, video_job_id, storyboard_id
    FROM all_content
    ORDER BY 
      dedup_key,
      CASE source_table
        WHEN 'video_job' THEN 1
        WHEN 'storyboard' THEN 2
        WHEN 'generation' THEN 3
      END,
      created_at DESC
  )
SELECT * FROM deduplicated;

-- Grant access to authenticated users
GRANT SELECT ON user_content_history TO authenticated;

-- Add comment for documentation
COMMENT ON VIEW user_content_history IS 'Unified view of user content from generations, video_jobs, and storyboards with deduplication';