-- Normalize generations table: convert old token values to credits
UPDATE generations 
SET 
  tokens_used = tokens_used / 100.0,
  actual_token_cost = COALESCE(actual_token_cost, tokens_used) / 100.0
WHERE tokens_used > 10 OR actual_token_cost > 10;

-- Normalize video_jobs table
UPDATE video_jobs
SET cost_tokens = cost_tokens / 100.0
WHERE cost_tokens > 10;

-- Normalize storyboards table
UPDATE storyboards
SET 
  tokens_cost = tokens_cost / 100.0,
  estimated_render_cost = estimated_render_cost / 100.0
WHERE tokens_cost > 10 OR estimated_render_cost > 10;