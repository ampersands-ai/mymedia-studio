-- =====================================================
-- PHASE 1 REMAINING FIXES: Restrict Base Table Access
-- =====================================================

-- 2. Restrict template_landing_pages base table access (drop first, then create)
DROP POLICY IF EXISTS "Anyone can view published templates" ON template_landing_pages;
DROP POLICY IF EXISTS "Admins can manage all templates" ON template_landing_pages;

CREATE POLICY "Admins can manage all templates"
  ON template_landing_pages FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. Restrict cinematic_prompts base table access (drop first, then create)
DROP POLICY IF EXISTS "Active prompts are viewable by everyone" ON cinematic_prompts;
DROP POLICY IF EXISTS "Admins can manage all prompts" ON cinematic_prompts;

CREATE POLICY "Admins can manage all prompts"
  ON cinematic_prompts FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role));