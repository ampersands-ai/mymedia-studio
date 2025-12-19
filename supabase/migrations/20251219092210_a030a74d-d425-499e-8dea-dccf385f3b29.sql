-- ============================================
-- Admin Audit Logging Triggers
-- Logs when admins access user data for security monitoring
-- ============================================

-- Create helper function to check if user is admin (using existing has_role pattern)
CREATE OR REPLACE FUNCTION public.is_admin_user(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = check_user_id
      AND role = 'admin'
  )
$$;

-- Create function for logging admin profile access
-- This runs AFTER a profile is accessed and logs if an admin viewed another user's profile
CREATE OR REPLACE FUNCTION public.log_admin_profile_access_fn()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if:
  -- 1. Current user is authenticated
  -- 2. Current user is an admin
  -- 3. Admin is viewing someone else's profile (not their own)
  IF auth.uid() IS NOT NULL 
     AND public.is_admin_user(auth.uid()) 
     AND auth.uid() != NEW.id THEN
    
    INSERT INTO public.audit_logs (
      user_id, 
      action, 
      resource_type, 
      resource_id, 
      metadata
    )
    VALUES (
      auth.uid(),
      'admin_view_profile',
      'profiles',
      NEW.id::text,
      jsonb_build_object(
        'viewed_user_id', NEW.id,
        'admin_id', auth.uid(),
        'timestamp', now()
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function for logging admin generation access
CREATE OR REPLACE FUNCTION public.log_admin_generation_access_fn()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if admin is viewing another user's generation
  IF auth.uid() IS NOT NULL 
     AND public.is_admin_user(auth.uid()) 
     AND auth.uid() != NEW.user_id THEN
    
    INSERT INTO public.audit_logs (
      user_id, 
      action, 
      resource_type, 
      resource_id, 
      metadata
    )
    VALUES (
      auth.uid(),
      'admin_view_generation',
      'generations',
      NEW.id::text,
      jsonb_build_object(
        'generation_owner_id', NEW.user_id,
        'generation_id', NEW.id,
        'admin_id', auth.uid(),
        'timestamp', now()
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Note: PostgreSQL doesn't support AFTER SELECT triggers directly
-- These triggers will be attached to UPDATE operations as a proxy
-- For actual SELECT auditing, we use RLS policies or application-level logging

-- Create trigger for admin profile modifications (UPDATE captures admin interactions)
DROP TRIGGER IF EXISTS audit_admin_profile_update ON public.profiles;
CREATE TRIGGER audit_admin_profile_update
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_admin_profile_access_fn();

-- Create trigger for admin generation modifications
DROP TRIGGER IF EXISTS audit_admin_generation_update ON public.generations;
CREATE TRIGGER audit_admin_generation_update
  AFTER UPDATE ON public.generations
  FOR EACH ROW
  EXECUTE FUNCTION public.log_admin_generation_access_fn();

-- Add default security config thresholds for new detection algorithms
INSERT INTO public.security_config (config_key, config_value, description)
VALUES 
  ('profile_enum_threshold', '{"window_minutes": 5, "profile_lookups": 20}', 'Profile enumeration detection threshold'),
  ('bulk_download_threshold', '{"window_minutes": 10, "downloads": 50}', 'Bulk download detection threshold'),
  ('account_takeover_threshold', '{"window_hours": 24, "password_resets": 3}', 'Account takeover detection threshold'),
  ('admin_access_threshold', '{"window_minutes": 10, "count": 20}', 'Suspicious admin access threshold')
ON CONFLICT (config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value,
  description = EXCLUDED.description,
  updated_at = now();