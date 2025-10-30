-- Allow token costs to be decimal values
-- Change all token-related columns from integer to numeric

-- user_subscriptions
ALTER TABLE public.user_subscriptions
  ALTER COLUMN tokens_remaining TYPE numeric USING tokens_remaining::numeric,
  ALTER COLUMN tokens_total TYPE numeric USING tokens_total::numeric;

-- generations
ALTER TABLE public.generations
  ALTER COLUMN tokens_used TYPE numeric USING tokens_used::numeric,
  ALTER COLUMN actual_token_cost TYPE numeric USING actual_token_cost::numeric;

-- ai_models
ALTER TABLE public.ai_models
  ALTER COLUMN base_token_cost TYPE numeric USING base_token_cost::numeric;

-- template_landing_pages
ALTER TABLE public.template_landing_pages
  ALTER COLUMN token_cost TYPE numeric USING token_cost::numeric;

-- video_jobs
ALTER TABLE public.video_jobs
  ALTER COLUMN cost_tokens TYPE numeric USING cost_tokens::numeric;

-- storyboards
ALTER TABLE public.storyboards
  ALTER COLUMN tokens_cost TYPE numeric USING tokens_cost::numeric,
  ALTER COLUMN estimated_render_cost TYPE numeric USING estimated_render_cost::numeric;

-- workflow_executions
ALTER TABLE public.workflow_executions
  ALTER COLUMN tokens_used TYPE numeric USING tokens_used::numeric;

-- token_dispute_reports
ALTER TABLE public.token_dispute_reports
  ALTER COLUMN refund_amount TYPE numeric USING refund_amount::numeric;

-- token_dispute_history
ALTER TABLE public.token_dispute_history
  ALTER COLUMN refund_amount TYPE numeric USING refund_amount::numeric;