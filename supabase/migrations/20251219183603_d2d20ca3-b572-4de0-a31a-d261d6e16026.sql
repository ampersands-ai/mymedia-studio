-- Add deny-all RLS policies for token tables
-- These tables are only accessed by edge functions using service_role key

-- Policy for email_verification_tokens: deny all client access
CREATE POLICY "Deny all client access" 
ON public.email_verification_tokens 
FOR ALL 
USING (false) 
WITH CHECK (false);

-- Policy for password_reset_tokens: deny all client access
CREATE POLICY "Deny all client access" 
ON public.password_reset_tokens 
FOR ALL 
USING (false) 
WITH CHECK (false);