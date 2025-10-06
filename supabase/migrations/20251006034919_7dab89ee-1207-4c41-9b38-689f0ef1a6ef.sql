-- Phase 1: Performance Indexes
-- User lookups (most frequent queries)
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(id);
CREATE INDEX IF NOT EXISTS idx_generations_user_id ON public.generations(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);

-- Status-based queries for generations
CREATE INDEX IF NOT EXISTS idx_generations_status ON public.generations(status);
CREATE INDEX IF NOT EXISTS idx_generations_user_status ON public.generations(user_id, status);

-- Template and model lookups
CREATE INDEX IF NOT EXISTS idx_content_templates_active ON public.content_templates(is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_ai_models_active ON public.ai_models(is_active, content_type);

-- Time-based queries for cleanup and analytics
CREATE INDEX IF NOT EXISTS idx_generations_created_at ON public.generations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier_action ON public.rate_limits(identifier, action);

-- Composite index for generation history queries
CREATE INDEX IF NOT EXISTS idx_generations_user_created ON public.generations(user_id, created_at DESC);

-- Phase 4: Rate Limiting Enhancement
CREATE TABLE IF NOT EXISTS public.rate_limit_tiers (
  tier text PRIMARY KEY,
  max_generations_per_hour integer NOT NULL,
  max_concurrent_generations integer NOT NULL
);

INSERT INTO public.rate_limit_tiers (tier, max_generations_per_hour, max_concurrent_generations)
VALUES
  ('freemium', 10, 1),
  ('basic', 50, 3),
  ('pro', 200, 10),
  ('enterprise', 1000, 50)
ON CONFLICT (tier) DO UPDATE SET
  max_generations_per_hour = EXCLUDED.max_generations_per_hour,
  max_concurrent_generations = EXCLUDED.max_concurrent_generations;

-- Phase 5: Enable Real-Time for token updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_subscriptions;

-- Phase 6: Enable query performance monitoring
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;