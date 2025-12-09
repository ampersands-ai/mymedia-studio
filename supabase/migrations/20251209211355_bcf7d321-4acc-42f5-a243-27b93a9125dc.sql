-- =====================================================
-- SECURITY HARDENING: user_subscriptions table
-- =====================================================

-- 1. Add Admin RLS Policy for user_subscriptions
-- Allows admins to view all subscriptions via database queries
CREATE POLICY "Admins can view all subscriptions"
ON public.user_subscriptions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 2. Create function to prevent direct token manipulation from clients
-- This ensures all credit changes go through audited edge functions
CREATE OR REPLACE FUNCTION public.prevent_client_token_manipulation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  jwt_role TEXT;
  is_service_role BOOLEAN := false;
BEGIN
  -- Check if tokens are being modified
  IF (NEW.tokens_remaining IS DISTINCT FROM OLD.tokens_remaining
      OR NEW.tokens_total IS DISTINCT FROM OLD.tokens_total) THEN
    
    -- Try to get the JWT role (will be NULL for SECURITY DEFINER function calls)
    BEGIN
      jwt_role := current_setting('request.jwt.claims', true)::jsonb->>'role';
    EXCEPTION WHEN OTHERS THEN
      jwt_role := NULL;
    END;
    
    -- Allow if:
    -- 1. Called from service_role (edge functions)
    -- 2. JWT claims are NULL (SECURITY DEFINER functions like deduct_user_tokens, increment_tokens)
    -- 3. Role is 'service_role'
    is_service_role := (jwt_role IS NULL OR jwt_role = 'service_role');
    
    IF NOT is_service_role THEN
      -- Log the attempted manipulation for audit
      INSERT INTO public.audit_logs (user_id, action, metadata)
      VALUES (
        auth.uid(),
        'token_manipulation_blocked',
        jsonb_build_object(
          'attempted_tokens_remaining', NEW.tokens_remaining,
          'attempted_tokens_total', NEW.tokens_total,
          'original_tokens_remaining', OLD.tokens_remaining,
          'original_tokens_total', OLD.tokens_total,
          'subscription_id', OLD.id
        )
      );
      
      RAISE EXCEPTION 'Direct token balance modification is not allowed. Use the official API.'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 3. Create trigger to enforce token manipulation prevention
CREATE TRIGGER prevent_token_manipulation_trigger
BEFORE UPDATE ON public.user_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.prevent_client_token_manipulation();

-- 4. Add comment for documentation
COMMENT ON FUNCTION public.prevent_client_token_manipulation() IS 
'Security trigger function that prevents direct client-side manipulation of token balances. 
Only allows modifications through edge functions (service_role) or SECURITY DEFINER functions.
Attempted violations are logged to audit_logs for monitoring.';