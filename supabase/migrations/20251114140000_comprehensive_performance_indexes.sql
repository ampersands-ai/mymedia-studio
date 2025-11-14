-- Comprehensive Performance Index Migration
-- Purpose: Add missing indexes for 10,000 concurrent users scale
-- Created: 2025-11-14

-- ============================================================================
-- GENERATIONS TABLE INDEXES
-- ============================================================================

-- Composite index for polling queries (most common operation)
CREATE INDEX IF NOT EXISTS idx_generations_polling
  ON public.generations(user_id, status, created_at DESC)
  WHERE status IN ('pending', 'processing');

-- Index for parent-child generation queries (used in polling)
CREATE INDEX IF NOT EXISTS idx_generations_parent_type
  ON public.generations(parent_generation_id, type, output_index)
  WHERE parent_generation_id IS NOT NULL;

-- Index for model performance queries
CREATE INDEX IF NOT EXISTS idx_generations_model_status
  ON public.generations(model_id, status, created_at DESC);

-- Partial index for failed generations (admin monitoring)
CREATE INDEX IF NOT EXISTS idx_generations_failed
  ON public.generations(user_id, created_at DESC, provider_response)
  WHERE status = 'failed';

-- ============================================================================
-- USER_SUBSCRIPTIONS TABLE INDEXES
-- ============================================================================

-- Index for token balance queries (critical path)
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_active
  ON public.user_subscriptions(user_id, created_at DESC)
  WHERE status = 'active';

-- Index for payment webhook duplicate detection
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_transaction
  ON public.user_subscriptions(transaction_id)
  WHERE transaction_id IS NOT NULL;

-- Index for revenue analytics
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_revenue
  ON public.user_subscriptions(created_at DESC, amount, currency)
  WHERE status = 'active';

-- ============================================================================
-- STORYBOARDS TABLE INDEXES
-- ============================================================================

-- Index for user storyboard listing
CREATE INDEX IF NOT EXISTS idx_storyboards_user_created
  ON public.storyboards(user_id, created_at DESC);

-- Index for storyboard status polling
CREATE INDEX IF NOT EXISTS idx_storyboards_status
  ON public.storyboards(user_id, status, updated_at DESC)
  WHERE status IN ('rendering', 'processing');

-- ============================================================================
-- STORYBOARD_SCENES TABLE INDEXES
-- ============================================================================

-- Index for scene ordering
CREATE INDEX IF NOT EXISTS idx_storyboard_scenes_order
  ON public.storyboard_scenes(storyboard_id, scene_number);

-- Index for generation tracking
CREATE INDEX IF NOT EXISTS idx_storyboard_scenes_generation
  ON public.storyboard_scenes(image_generation_id)
  WHERE image_generation_id IS NOT NULL;

-- ============================================================================
-- WORKFLOW_EXECUTIONS TABLE INDEXES
-- ============================================================================

-- Index for workflow polling
CREATE INDEX IF NOT EXISTS idx_workflow_executions_user_status
  ON public.workflow_executions(user_id, status, created_at DESC);

-- Index for workflow template analytics
CREATE INDEX IF NOT EXISTS idx_workflow_executions_template
  ON public.workflow_executions(workflow_template_id, status, created_at DESC);

-- ============================================================================
-- AI_MODELS TABLE INDEXES
-- ============================================================================

-- Index for active model lookups (heavily cached but still useful)
CREATE INDEX IF NOT EXISTS idx_ai_models_active
  ON public.ai_models(is_active, provider)
  WHERE is_active = true;

-- Index for model costs (pricing calculations)
CREATE INDEX IF NOT EXISTS idx_ai_models_pricing
  ON public.ai_models(provider, cost_per_generation)
  WHERE is_active = true;

-- ============================================================================
-- CONTENT_TEMPLATES TABLE INDEXES
-- ============================================================================

-- Index for template gallery
CREATE INDEX IF NOT EXISTS idx_content_templates_category
  ON public.content_templates(category, is_active, name);

-- Index for template popularity tracking
CREATE INDEX IF NOT EXISTS idx_content_templates_popularity
  ON public.content_templates(usage_count DESC, is_active)
  WHERE is_active = true;

-- ============================================================================
-- MODEL_HEALTH_RECORDS TABLE INDEXES
-- ============================================================================

-- Index for recent health checks
CREATE INDEX IF NOT EXISTS idx_model_health_recent
  ON public.model_health_records(model_id, checked_at DESC);

-- Index for unhealthy models (admin alerts)
CREATE INDEX IF NOT EXISTS idx_model_health_unhealthy
  ON public.model_health_records(is_healthy, checked_at DESC)
  WHERE is_healthy = false;

-- ============================================================================
-- API_CALL_LOGS TABLE INDEXES
-- ============================================================================

-- Index for API analytics
CREATE INDEX IF NOT EXISTS idx_api_call_logs_provider
  ON public.api_call_logs(provider, created_at DESC);

-- Index for error tracking
CREATE INDEX IF NOT EXISTS idx_api_call_logs_errors
  ON public.api_call_logs(provider, created_at DESC, error_message)
  WHERE error_message IS NOT NULL;

-- Index for response time monitoring
CREATE INDEX IF NOT EXISTS idx_api_call_logs_performance
  ON public.api_call_logs(provider, created_at DESC, response_time_ms);

-- ============================================================================
-- PROFILES TABLE INDEXES
-- ============================================================================

-- Index for user lookup by email (admin user search)
CREATE INDEX IF NOT EXISTS idx_profiles_email
  ON public.profiles(email);

-- Index for user roles (RBAC queries)
CREATE INDEX IF NOT EXISTS idx_profiles_role
  ON public.profiles(id)
  INCLUDE (created_at)
  WHERE id IN (SELECT user_id FROM public.user_roles);

-- ============================================================================
-- WEBHOOK_EVENTS TABLE INDEXES
-- ============================================================================

-- Index for webhook processing
CREATE INDEX IF NOT EXISTS idx_webhook_events_status
  ON public.webhook_events(provider, status, created_at DESC);

-- Index for failed webhook retry
CREATE INDEX IF NOT EXISTS idx_webhook_events_retry
  ON public.webhook_events(status, retry_count, created_at)
  WHERE status = 'failed' AND retry_count < 3;

-- ============================================================================
-- FUNCTION_LOGS TABLE INDEXES (Already exists but verify)
-- ============================================================================

-- These should already exist from migration 20251112205707
-- Verifying they exist:
-- idx_function_logs_function_name
-- idx_function_logs_level
-- idx_function_logs_created_at
-- idx_function_logs_critical
-- idx_function_logs_user

-- ============================================================================
-- CLEANUP: Remove duplicate/redundant indexes
-- ============================================================================

-- Note: idx_generations_user_id_status and idx_generations_user_status are duplicates
-- Keep the one with DESC on created_at (more useful)
DROP INDEX IF EXISTS idx_generations_user_id_status;

-- ============================================================================
-- STATISTICS UPDATE
-- ============================================================================

-- Update table statistics for query planner
ANALYZE public.generations;
ANALYZE public.user_subscriptions;
ANALYZE public.video_jobs;
ANALYZE public.storyboards;
ANALYZE public.storyboard_scenes;
ANALYZE public.workflow_executions;
ANALYZE public.ai_models;
ANALYZE public.content_templates;
ANALYZE public.api_call_logs;

-- ============================================================================
-- VACUUM (Optional - comment out if causing issues)
-- ============================================================================

-- VACUUM ANALYZE public.generations;
-- VACUUM ANALYZE public.user_subscriptions;

COMMENT ON INDEX idx_generations_polling IS 'Optimizes polling queries for active generations';
COMMENT ON INDEX idx_generations_parent_type IS 'Optimizes child generation fetching in polling';
COMMENT ON INDEX idx_user_subscriptions_user_active IS 'Critical path index for token balance checks';
COMMENT ON INDEX idx_storyboards_status IS 'Optimizes storyboard rendering status polling';
COMMENT ON INDEX idx_api_call_logs_errors IS 'Enables fast error tracking and alerts';
COMMENT ON INDEX idx_model_health_unhealthy IS 'Enables fast unhealthy model detection for alerts';
