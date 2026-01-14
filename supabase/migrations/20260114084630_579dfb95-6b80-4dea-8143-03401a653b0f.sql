-- ============================================
-- SECURITY FIXES MIGRATION
-- Fixes: Security Definer View, Missing RLS Policies, 
-- Functions without search_path, Overly Permissive Policies
-- ============================================

-- ============================================
-- PHASE 1: Fix Security Definer View
-- ============================================

-- Recreate user_content_history view with security_invoker=on
DROP VIEW IF EXISTS public.user_content_history;
CREATE VIEW public.user_content_history
WITH (security_invoker=on) AS
SELECT 
  g.id,
  g.type,
  g.prompt,
  g.output_url,
  g.status,
  g.created_at,
  g.completed_at,
  g.model_id,
  g.tokens_used,
  g.user_id
FROM generations g
WHERE g.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role);

-- ============================================
-- PHASE 2: Fix RLS Enabled with No Policies (prerender_cache)
-- ============================================

-- Allow service role full access to prerender cache
CREATE POLICY "Service role can manage prerender cache"
  ON public.prerender_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow public read access for serving cached pages
CREATE POLICY "Anyone can read prerender cache"
  ON public.prerender_cache
  FOR SELECT
  TO public
  USING (true);

-- ============================================
-- PHASE 3: Fix Functions Missing search_path
-- ============================================

-- Fix increment_model_page_view_count (SECURITY DEFINER - HIGH PRIORITY)
CREATE OR REPLACE FUNCTION public.increment_model_page_view_count(page_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE model_pages 
  SET view_count = view_count + 1 
  WHERE id = page_id;
$$;

-- Fix update_blackboard_updated_at
CREATE OR REPLACE FUNCTION public.update_blackboard_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix update_model_pages_updated_at
CREATE OR REPLACE FUNCTION public.update_model_pages_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================
-- PHASE 4: Fix Overly Permissive RLS Policies
-- ============================================

-- 1. Fix admin_realtime_alerts - restrict to service_role only
DROP POLICY IF EXISTS "System can insert alerts" ON public.admin_realtime_alerts;
CREATE POLICY "Service role can insert alerts"
  ON public.admin_realtime_alerts
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- 2. Fix api_call_logs - restrict to service_role only
DROP POLICY IF EXISTS "Service role can insert API call logs" ON public.api_call_logs;
DROP POLICY IF EXISTS "Service role can update API call logs" ON public.api_call_logs;
CREATE POLICY "Service role can insert API call logs"
  ON public.api_call_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);
CREATE POLICY "Service role can update API call logs"
  ON public.api_call_logs
  FOR UPDATE
  TO service_role
  USING (true);

-- 3. Fix consent_audit_log - restrict to service_role only
DROP POLICY IF EXISTS "consent_audit_service_insert" ON public.consent_audit_log;
CREATE POLICY "Service role can insert consent audit"
  ON public.consent_audit_log
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- 4. Fix email_history - restrict to service_role only
DROP POLICY IF EXISTS "Service role can insert email history" ON public.email_history;
CREATE POLICY "Service role can insert email history"
  ON public.email_history
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- 5. Fix error_events - restrict to service_role only
DROP POLICY IF EXISTS "Service role can insert error events" ON public.error_events;
CREATE POLICY "Service role can insert error events"
  ON public.error_events
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- 6. Fix generation_notifications - restrict to service_role only
DROP POLICY IF EXISTS "Service role can insert generation notifications" ON public.generation_notifications;
CREATE POLICY "Service role can insert generation notifications"
  ON public.generation_notifications
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- 7. Fix kie_credit_audits - restrict to service_role only
DROP POLICY IF EXISTS "Service role can insert credit audits" ON public.kie_credit_audits;
CREATE POLICY "Service role can insert credit audits"
  ON public.kie_credit_audits
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- 8. Fix moderation_logs - restrict to service_role only
DROP POLICY IF EXISTS "Service role can insert moderation logs" ON public.moderation_logs;
CREATE POLICY "Service role can insert moderation logs"
  ON public.moderation_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- 9. Fix user_error_notifications - restrict to service_role only
DROP POLICY IF EXISTS "Service role can insert user notifications" ON public.user_error_notifications;
CREATE POLICY "Service role can insert user notifications"
  ON public.user_error_notifications
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- 10. Fix user_notifications - restrict to service_role only
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.user_notifications;
CREATE POLICY "Service role can insert notifications"
  ON public.user_notifications
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- 11. Fix webhook_analytics - restrict to service_role only
DROP POLICY IF EXISTS "Service role can insert webhook analytics" ON public.webhook_analytics;
CREATE POLICY "Service role can insert webhook analytics"
  ON public.webhook_analytics
  FOR INSERT
  TO service_role
  WITH CHECK (true);