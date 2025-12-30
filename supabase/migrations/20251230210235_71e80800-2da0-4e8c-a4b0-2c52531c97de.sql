-- Fix user_consent_records RLS (CRITICAL - PII exposure)
DROP POLICY IF EXISTS "Users can view their own consent records" ON user_consent_records;
DROP POLICY IF EXISTS "Users can insert their own consent records" ON user_consent_records;
DROP POLICY IF EXISTS "Users can update their own consent records" ON user_consent_records;
DROP POLICY IF EXISTS "Authenticated users manage own consent" ON user_consent_records;
DROP POLICY IF EXISTS "Anonymous device consent allowed" ON user_consent_records;
DROP POLICY IF EXISTS "Admins manage all consent records" ON user_consent_records;
DROP POLICY IF EXISTS "Anyone can insert consent records" ON user_consent_records;
DROP POLICY IF EXISTS "Anyone can view consent records" ON user_consent_records;

-- Authenticated users can only manage their own records
CREATE POLICY "Authenticated users manage own consent"
  ON user_consent_records FOR ALL
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Anonymous device-based consent (cookie banner support)
CREATE POLICY "Anonymous device consent allowed"
  ON user_consent_records FOR ALL
  USING (user_id IS NULL AND device_id IS NOT NULL)
  WITH CHECK (user_id IS NULL AND device_id IS NOT NULL);

-- Admin override for GDPR compliance
CREATE POLICY "Admins manage all consent records"
  ON user_consent_records FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Fix template_landing_pages RLS (restrict base table, use view for public)
DROP POLICY IF EXISTS "Anyone can view published templates" ON template_landing_pages;
DROP POLICY IF EXISTS "Admins can manage all templates" ON template_landing_pages;

CREATE POLICY "Admins can manage all templates"
  ON template_landing_pages FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Fix cinematic_prompts RLS (restrict base table, use view for public)
DROP POLICY IF EXISTS "Active prompts are viewable by everyone" ON cinematic_prompts;
DROP POLICY IF EXISTS "Admins can manage all prompts" ON cinematic_prompts;

CREATE POLICY "Admins can manage all prompts"
  ON cinematic_prompts FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role));