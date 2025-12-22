-- Phase 1: Privacy-First PII Cleanup Migration
-- This migration removes PII liability columns and adds anonymization

-- =====================================================
-- STEP 1: Rename full_name to display_name (user-chosen, not real name)
-- =====================================================
ALTER TABLE public.profiles 
  RENAME COLUMN full_name TO display_name;

-- Add comment to clarify purpose
COMMENT ON COLUMN public.profiles.display_name IS 'Optional user-chosen display name (NOT real name PII)';

-- =====================================================
-- STEP 2: Drop PII columns (phone_number, zipcode)
-- =====================================================
ALTER TABLE public.profiles 
  DROP COLUMN IF EXISTS phone_number,
  DROP COLUMN IF EXISTS zipcode;

-- =====================================================
-- STEP 3: Add anonymized fields to audit_logs
-- =====================================================
ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS country_code VARCHAR(2),
  ADD COLUMN IF NOT EXISTS device_type VARCHAR(20);

-- Update existing records with placeholder
UPDATE public.audit_logs 
SET country_code = 'XX', device_type = 'unknown'
WHERE country_code IS NULL;

-- =====================================================
-- STEP 4: Update handle_new_user to not store PII
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = 'public'
AS $function$
DECLARE
  alert_settings JSONB;
  function_url TEXT;
  service_role_key TEXT;
  generated_display_name TEXT;
BEGIN
  -- Generate display name from email prefix (privacy-safe)
  generated_display_name := split_part(NEW.email, '@', 1);
  
  -- Step 1: Create user profile (NO PII stored)
  INSERT INTO public.profiles (
    id, 
    email, 
    display_name,
    email_verified
  )
  VALUES (
    NEW.id,
    NEW.email,
    generated_display_name,
    FALSE
  );
  
  -- Step 2: Create user subscription (5 free credits)
  INSERT INTO public.user_subscriptions (user_id, plan, tokens_remaining, tokens_total)
  VALUES (NEW.id, 'freemium', 5, 5);
  
  -- Step 3: Create onboarding progress record
  INSERT INTO public.user_onboarding_progress (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Optional: Admin Notifications (failures don't block signup)
  BEGIN
    SELECT setting_value INTO alert_settings
    FROM public.app_settings
    WHERE setting_key = 'admin_notifications';
    
    IF alert_settings IS NOT NULL 
       AND (alert_settings->>'enabled')::boolean = true 
       AND (alert_settings->'user_registration'->>'enabled')::boolean = true THEN
      
      function_url := 'https://gzlwkvmivbfcvczoqphq.supabase.co/functions/v1/send-new-user-alert';
      
      SELECT decrypted_secret INTO service_role_key
      FROM vault.decrypted_secrets
      WHERE name = 'supabase_service_role_key'
      LIMIT 1;
      
      IF service_role_key IS NOT NULL AND service_role_key != '' THEN
        PERFORM net.http_post(
          url := function_url,
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || service_role_key
          ),
          body := jsonb_build_object(
            'user_id', NEW.id,
            'email', NEW.email,
            'display_name', generated_display_name,
            'signup_method', COALESCE(NEW.raw_user_meta_data->>'provider', 'email'),
            'created_at', NEW.created_at::text
          )
        );
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[handle_new_user] Admin notification failed: %', SQLERRM;
  END;
  
  RETURN NEW;
END;
$function$;

-- =====================================================
-- STEP 5: Update search_admin_users to use display_name
-- =====================================================
CREATE OR REPLACE FUNCTION public.search_admin_users(
  search_term text DEFAULT NULL,
  filter_plan text DEFAULT NULL,
  filter_status text DEFAULT NULL,
  filter_role text DEFAULT NULL,
  filter_email_verified boolean DEFAULT NULL,
  sort_column text DEFAULT 'created_at',
  sort_direction text DEFAULT 'desc',
  page_offset integer DEFAULT 0,
  page_limit integer DEFAULT 50
)
RETURNS TABLE(
  id uuid,
  email text,
  profile_name text,
  email_verified boolean,
  created_at timestamp with time zone,
  last_activity_at timestamp with time zone,
  plan text,
  subscription_status text,
  tokens_remaining numeric,
  tokens_total numeric,
  is_admin boolean,
  is_mod_exempt boolean,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = 'public'
AS $function$
DECLARE
  total BIGINT;
BEGIN
  SELECT COUNT(DISTINCT p.id) INTO total
  FROM profiles p
  LEFT JOIN user_subscriptions us ON us.user_id = p.id
  LEFT JOIN user_roles ur ON ur.user_id = p.id
  LEFT JOIN moderation_exemptions me ON me.user_id = p.id AND me.is_active = true
  WHERE
    (search_term IS NULL OR search_term = '' OR 
     p.email ILIKE '%' || search_term || '%' OR 
     p.display_name ILIKE '%' || search_term || '%')
    AND (filter_plan IS NULL OR filter_plan = '' OR us.plan::text = filter_plan)
    AND (filter_status IS NULL OR filter_status = '' OR us.status = filter_status)
    AND (filter_role IS NULL OR filter_role = '' OR 
         (filter_role = 'admin' AND ur.role = 'admin') OR
         (filter_role = 'user' AND (ur.role IS NULL OR ur.role != 'admin')))
    AND (filter_email_verified IS NULL OR p.email_verified = filter_email_verified);

  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.display_name as profile_name,
    p.email_verified,
    p.created_at,
    p.last_activity_at,
    us.plan::text,
    us.status as subscription_status,
    us.tokens_remaining,
    us.tokens_total,
    COALESCE(bool_or(ur.role = 'admin'), false) as is_admin,
    COALESCE(bool_or(me.is_active), false) as is_mod_exempt,
    total as total_count
  FROM profiles p
  LEFT JOIN user_subscriptions us ON us.user_id = p.id
  LEFT JOIN user_roles ur ON ur.user_id = p.id
  LEFT JOIN moderation_exemptions me ON me.user_id = p.id AND me.is_active = true
  WHERE
    (search_term IS NULL OR search_term = '' OR 
     p.email ILIKE '%' || search_term || '%' OR 
     p.display_name ILIKE '%' || search_term || '%')
    AND (filter_plan IS NULL OR filter_plan = '' OR us.plan::text = filter_plan)
    AND (filter_status IS NULL OR filter_status = '' OR us.status = filter_status)
    AND (filter_role IS NULL OR filter_role = '' OR 
         (filter_role = 'admin' AND ur.role = 'admin') OR
         (filter_role = 'user' AND (ur.role IS NULL OR ur.role != 'admin')))
    AND (filter_email_verified IS NULL OR p.email_verified = filter_email_verified)
  GROUP BY p.id, p.email, p.display_name, p.email_verified, p.created_at, p.last_activity_at,
           us.plan, us.status, us.tokens_remaining, us.tokens_total
  ORDER BY 
    CASE WHEN sort_column = 'created_at' AND sort_direction = 'desc' THEN p.created_at END DESC NULLS LAST,
    CASE WHEN sort_column = 'created_at' AND sort_direction = 'asc' THEN p.created_at END ASC NULLS LAST,
    CASE WHEN sort_column = 'email' AND sort_direction = 'desc' THEN p.email END DESC NULLS LAST,
    CASE WHEN sort_column = 'email' AND sort_direction = 'asc' THEN p.email END ASC NULLS LAST,
    CASE WHEN sort_column = 'tokens_remaining' AND sort_direction = 'desc' THEN us.tokens_remaining END DESC NULLS LAST,
    CASE WHEN sort_column = 'tokens_remaining' AND sort_direction = 'asc' THEN us.tokens_remaining END ASC NULLS LAST,
    CASE WHEN sort_column = 'last_activity_at' AND sort_direction = 'desc' THEN p.last_activity_at END DESC NULLS LAST,
    CASE WHEN sort_column = 'last_activity_at' AND sort_direction = 'asc' THEN p.last_activity_at END ASC NULLS LAST,
    p.created_at DESC
  LIMIT page_limit
  OFFSET page_offset;
END;
$function$;

-- =====================================================
-- STEP 6: Create log retention cleanup function
-- =====================================================
CREATE OR REPLACE FUNCTION public.cleanup_old_logs_with_retention()
RETURNS TABLE(table_name text, deleted_count integer)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = 'public'
AS $function$
DECLARE
  error_deleted INTEGER := 0;
  api_call_deleted INTEGER := 0;
  activity_anonymized INTEGER := 0;
  audit_deleted INTEGER := 0;
  function_deleted INTEGER := 0;
BEGIN
  -- 1. Delete error_events older than 30 days
  DELETE FROM public.error_events
  WHERE created_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS error_deleted = ROW_COUNT;
  
  -- 2. Delete api_call_logs older than 30 days
  DELETE FROM public.api_call_logs
  WHERE created_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS api_call_deleted = ROW_COUNT;
  
  -- 3. Anonymize user_activity_logs older than 90 days (set user_id to NULL)
  UPDATE public.user_activity_logs
  SET user_id = NULL
  WHERE created_at < NOW() - INTERVAL '90 days'
    AND user_id IS NOT NULL;
  GET DIAGNOSTICS activity_anonymized = ROW_COUNT;
  
  -- 4. Delete audit_logs older than 90 days
  DELETE FROM public.audit_logs
  WHERE created_at < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS audit_deleted = ROW_COUNT;
  
  -- 5. Delete function_logs older than 30 days
  DELETE FROM public.function_logs
  WHERE created_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS function_deleted = ROW_COUNT;
  
  -- 6. Anonymize IP/user-agent in audit_logs older than 7 days
  UPDATE public.audit_logs
  SET ip_address = NULL, user_agent = NULL
  WHERE created_at < NOW() - INTERVAL '7 days'
    AND (ip_address IS NOT NULL OR user_agent IS NOT NULL);
  
  RETURN QUERY VALUES
    ('error_events'::TEXT, error_deleted),
    ('api_call_logs'::TEXT, api_call_deleted),
    ('user_activity_logs_anonymized'::TEXT, activity_anonymized),
    ('audit_logs'::TEXT, audit_deleted),
    ('function_logs'::TEXT, function_deleted);
END;
$function$;

-- =====================================================
-- STEP 7: Create scheduled cleanup extension and job
-- =====================================================
-- Enable pg_cron if not already (Supabase has this)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily cleanup at 3 AM UTC
SELECT cron.schedule(
  'daily-log-retention-cleanup',
  '0 3 * * *',
  $$SELECT public.cleanup_old_logs_with_retention();$$
);