-- Phase 2: Fix Critical RLS Issues - Apply Gold Standard Pattern
-- This migration applies consistent, secure RLS policies across all user-owned tables

-- ============================================
-- 1. USER_SUBSCRIPTIONS - Payment data protection
-- ============================================
DROP POLICY IF EXISTS "user_subscriptions_select_own" ON public.user_subscriptions;
DROP POLICY IF EXISTS "user_subscriptions_insert_own" ON public.user_subscriptions;
DROP POLICY IF EXISTS "user_subscriptions_update_own" ON public.user_subscriptions;
DROP POLICY IF EXISTS "user_subscriptions_delete_own" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can insert their own subscription" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscription" ON public.user_subscriptions;

CREATE POLICY "user_subscriptions_select_own" ON public.user_subscriptions
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "user_subscriptions_insert_own" ON public.user_subscriptions
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_subscriptions_update_own" ON public.user_subscriptions
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_subscriptions_delete_own" ON public.user_subscriptions
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- ============================================
-- 2. EMAIL_HISTORY - Email addresses protection
-- ============================================
DROP POLICY IF EXISTS "email_history_select_own" ON public.email_history;
DROP POLICY IF EXISTS "email_history_insert_own" ON public.email_history;
DROP POLICY IF EXISTS "Users can view own email history" ON public.email_history;
DROP POLICY IF EXISTS "Allow authenticated users to view their own email history" ON public.email_history;

CREATE POLICY "email_history_select_own" ON public.email_history
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "email_history_insert_own" ON public.email_history
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 3. PUSH_SUBSCRIPTIONS - Endpoint protection
-- ============================================
DROP POLICY IF EXISTS "push_subscriptions_select_own" ON public.push_subscriptions;
DROP POLICY IF EXISTS "push_subscriptions_insert_own" ON public.push_subscriptions;
DROP POLICY IF EXISTS "push_subscriptions_update_own" ON public.push_subscriptions;
DROP POLICY IF EXISTS "push_subscriptions_delete_own" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can manage their own push subscriptions" ON public.push_subscriptions;

CREATE POLICY "push_subscriptions_select_own" ON public.push_subscriptions
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "push_subscriptions_insert_own" ON public.push_subscriptions
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "push_subscriptions_update_own" ON public.push_subscriptions
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "push_subscriptions_delete_own" ON public.push_subscriptions
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- ============================================
-- 4. VAPID_KEYS - Private key protection (service_role only)
-- ============================================
DROP POLICY IF EXISTS "vapid_keys_select" ON public.vapid_keys;
DROP POLICY IF EXISTS "vapid_keys_insert" ON public.vapid_keys;
DROP POLICY IF EXISTS "vapid_keys_update" ON public.vapid_keys;
DROP POLICY IF EXISTS "vapid_keys_service_only" ON public.vapid_keys;
DROP POLICY IF EXISTS "Allow service role only" ON public.vapid_keys;

-- No policies for public/authenticated - only service_role can access via API
-- This means the table is completely locked from client-side access

-- ============================================
-- 5. USER_SESSIONS - IP/UA data protection
-- ============================================
DROP POLICY IF EXISTS "user_sessions_select_own" ON public.user_sessions;
DROP POLICY IF EXISTS "user_sessions_insert_own" ON public.user_sessions;
DROP POLICY IF EXISTS "user_sessions_update_own" ON public.user_sessions;
DROP POLICY IF EXISTS "user_sessions_delete_own" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can view own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can manage their own sessions" ON public.user_sessions;

CREATE POLICY "user_sessions_select_own" ON public.user_sessions
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "user_sessions_insert_own" ON public.user_sessions
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_sessions_update_own" ON public.user_sessions
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_sessions_delete_own" ON public.user_sessions
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- ============================================
-- 6. SIGNUP_ATTRIBUTION - Marketing data protection
-- ============================================
DROP POLICY IF EXISTS "signup_attribution_select_own" ON public.signup_attribution;
DROP POLICY IF EXISTS "signup_attribution_insert_own" ON public.signup_attribution;
DROP POLICY IF EXISTS "Users can view own attribution" ON public.signup_attribution;
DROP POLICY IF EXISTS "Allow users to view their own signup attribution" ON public.signup_attribution;

CREATE POLICY "signup_attribution_select_own" ON public.signup_attribution
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "signup_attribution_insert_own" ON public.signup_attribution
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 7. GENERATIONS - Creative work protection
-- ============================================
DROP POLICY IF EXISTS "generations_select_own" ON public.generations;
DROP POLICY IF EXISTS "generations_insert_own" ON public.generations;
DROP POLICY IF EXISTS "generations_update_own" ON public.generations;
DROP POLICY IF EXISTS "generations_delete_own" ON public.generations;
DROP POLICY IF EXISTS "Users can view own generations" ON public.generations;
DROP POLICY IF EXISTS "Users can create own generations" ON public.generations;
DROP POLICY IF EXISTS "Users can update own generations" ON public.generations;
DROP POLICY IF EXISTS "Users can delete own generations" ON public.generations;

CREATE POLICY "generations_select_own" ON public.generations
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "generations_insert_own" ON public.generations
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "generations_update_own" ON public.generations
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "generations_delete_own" ON public.generations
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- ============================================
-- 8. VIDEO_JOBS - Video content protection
-- ============================================
DROP POLICY IF EXISTS "video_jobs_select_own" ON public.video_jobs;
DROP POLICY IF EXISTS "video_jobs_insert_own" ON public.video_jobs;
DROP POLICY IF EXISTS "video_jobs_update_own" ON public.video_jobs;
DROP POLICY IF EXISTS "video_jobs_delete_own" ON public.video_jobs;
DROP POLICY IF EXISTS "Users can view own video jobs" ON public.video_jobs;
DROP POLICY IF EXISTS "Users can create own video jobs" ON public.video_jobs;
DROP POLICY IF EXISTS "Users can update own video jobs" ON public.video_jobs;

CREATE POLICY "video_jobs_select_own" ON public.video_jobs
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "video_jobs_insert_own" ON public.video_jobs
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "video_jobs_update_own" ON public.video_jobs
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "video_jobs_delete_own" ON public.video_jobs
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- ============================================
-- 9. STORYBOARDS - Script protection
-- ============================================
DROP POLICY IF EXISTS "storyboards_select_own" ON public.storyboards;
DROP POLICY IF EXISTS "storyboards_insert_own" ON public.storyboards;
DROP POLICY IF EXISTS "storyboards_update_own" ON public.storyboards;
DROP POLICY IF EXISTS "storyboards_delete_own" ON public.storyboards;
DROP POLICY IF EXISTS "Users can view own storyboards" ON public.storyboards;
DROP POLICY IF EXISTS "Users can create own storyboards" ON public.storyboards;
DROP POLICY IF EXISTS "Users can update own storyboards" ON public.storyboards;
DROP POLICY IF EXISTS "Users can delete own storyboards" ON public.storyboards;

CREATE POLICY "storyboards_select_own" ON public.storyboards
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "storyboards_insert_own" ON public.storyboards
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "storyboards_update_own" ON public.storyboards
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "storyboards_delete_own" ON public.storyboards
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- ============================================
-- 10. WORKFLOW_EXECUTIONS - Workflow data protection
-- ============================================
DROP POLICY IF EXISTS "workflow_executions_select_own" ON public.workflow_executions;
DROP POLICY IF EXISTS "workflow_executions_insert_own" ON public.workflow_executions;
DROP POLICY IF EXISTS "workflow_executions_update_own" ON public.workflow_executions;
DROP POLICY IF EXISTS "workflow_executions_delete_own" ON public.workflow_executions;
DROP POLICY IF EXISTS "Users can view own workflow executions" ON public.workflow_executions;
DROP POLICY IF EXISTS "Users can create own workflow executions" ON public.workflow_executions;

CREATE POLICY "workflow_executions_select_own" ON public.workflow_executions
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "workflow_executions_insert_own" ON public.workflow_executions
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "workflow_executions_update_own" ON public.workflow_executions
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "workflow_executions_delete_own" ON public.workflow_executions
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- ============================================
-- 11. USER_NOTIFICATION_PREFERENCES - Preferences protection
-- ============================================
DROP POLICY IF EXISTS "user_notification_preferences_select_own" ON public.user_notification_preferences;
DROP POLICY IF EXISTS "user_notification_preferences_insert_own" ON public.user_notification_preferences;
DROP POLICY IF EXISTS "user_notification_preferences_update_own" ON public.user_notification_preferences;
DROP POLICY IF EXISTS "user_notification_preferences_delete_own" ON public.user_notification_preferences;
DROP POLICY IF EXISTS "Users can view own notification preferences" ON public.user_notification_preferences;
DROP POLICY IF EXISTS "Users can manage their notification preferences" ON public.user_notification_preferences;

CREATE POLICY "user_notification_preferences_select_own" ON public.user_notification_preferences
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "user_notification_preferences_insert_own" ON public.user_notification_preferences
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_notification_preferences_update_own" ON public.user_notification_preferences
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_notification_preferences_delete_own" ON public.user_notification_preferences
FOR DELETE TO authenticated
USING (auth.uid() = user_id);