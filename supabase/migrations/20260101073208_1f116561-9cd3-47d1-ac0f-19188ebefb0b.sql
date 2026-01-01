-- Performance indexes for frequently queried columns
-- Optimize generations table queries (most common hot path)
CREATE INDEX IF NOT EXISTS idx_generations_user_status_created 
ON public.generations(user_id, status, created_at DESC);

-- Optimize active/pending generation queries
CREATE INDEX IF NOT EXISTS idx_generations_hot_path
ON public.generations(user_id, status, created_at DESC)
WHERE status IN ('pending', 'processing');

-- Optimize user subscription lookups
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id
ON public.user_subscriptions(user_id);

-- Optimize audit logs time-based queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
ON public.audit_logs(created_at DESC);

-- Optimize video jobs by user and status
CREATE INDEX IF NOT EXISTS idx_video_jobs_user_status
ON public.video_jobs(user_id, status, created_at DESC);