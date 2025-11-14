-- Performance Indexes (Corrected)
CREATE INDEX IF NOT EXISTS idx_generations_polling
  ON public.generations(user_id, status, created_at DESC)
  WHERE status IN ('pending', 'processing');

CREATE INDEX IF NOT EXISTS idx_generations_parent_type
  ON public.generations(parent_generation_id, type, output_index)
  WHERE parent_generation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_generations_model_status
  ON public.generations(model_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_generations_failed
  ON public.generations(user_id, created_at DESC)
  WHERE status = 'failed';

CREATE INDEX IF NOT EXISTS idx_storyboards_user_created
  ON public.storyboards(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_storyboards_status
  ON public.storyboards(user_id, status, updated_at DESC)
  WHERE status IN ('rendering', 'processing');

CREATE INDEX IF NOT EXISTS idx_storyboard_scenes_order
  ON public.storyboard_scenes(storyboard_id, order_number);

CREATE INDEX IF NOT EXISTS idx_workflow_executions_user_status
  ON public.workflow_executions(user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_workflow_executions_template
  ON public.workflow_executions(workflow_template_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_models_active
  ON public.ai_models(is_active, provider)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_content_templates_category
  ON public.content_templates(category, is_active, display_order);

CREATE INDEX IF NOT EXISTS idx_profiles_email
  ON public.profiles(email);