-- Phase 1: Critical PII Protection
-- Add explicit deny policy for unauthenticated access to profiles
CREATE POLICY "Deny unauthenticated access to profiles"
ON public.profiles
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Phase 2: Sanitization function for provider data
CREATE OR REPLACE FUNCTION public.sanitize_provider_data(data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Remove sensitive fields that might contain API keys or credentials
  data := data - 'api_key' - 'authorization' - 'token' - 'secret' - 'apiKey' - 'Authorization' - 'Bearer';
  
  -- Remove nested credential fields if they exist
  IF data ? 'headers' THEN
    data := jsonb_set(data, '{headers}', (data->'headers') - 'authorization' - 'Authorization' - 'api_key');
  END IF;
  
  RETURN data;
END;
$$;

-- Phase 3: Fix Audit Log Policies
-- Remove the blocking INSERT policy
DROP POLICY IF EXISTS "Service role can insert logs" ON public.audit_logs;

-- Create proper service role INSERT policy
CREATE POLICY "Allow service role to insert audit logs"
ON public.audit_logs
FOR INSERT
TO service_role
WITH CHECK (true);

-- Prevent audit log tampering
CREATE POLICY "Prevent audit log modifications"
ON public.audit_logs
FOR UPDATE
USING (false);

CREATE POLICY "Prevent audit log deletion"
ON public.audit_logs
FOR DELETE
USING (false);

-- Phase 4: Enhanced Role Security
-- Prevent users from modifying their own roles
CREATE POLICY "Prevent users from modifying own roles"
ON public.user_roles
FOR UPDATE
USING (auth.uid() != user_id OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Prevent users from deleting their own roles
CREATE POLICY "Prevent users from deleting own roles"
ON public.user_roles
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Phase 5: Rate Limits Protection
-- Add explicit deny for authenticated users (only service role should access)
CREATE POLICY "Deny authenticated user access to rate_limits"
ON public.rate_limits
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);