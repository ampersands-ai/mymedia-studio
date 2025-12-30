-- Fix vapid_keys - should only be accessible by service role (edge functions)
-- RLS with no policies = blocks all client access, service role bypasses
ALTER TABLE IF EXISTS vapid_keys ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Admin access vapid keys" ON vapid_keys;

-- Only admins can view (service role bypasses RLS anyway)
CREATE POLICY "Admin access vapid keys"
  ON vapid_keys FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role));