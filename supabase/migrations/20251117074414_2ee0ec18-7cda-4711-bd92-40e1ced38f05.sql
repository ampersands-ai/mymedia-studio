-- Fix search_path for all trigger functions

-- Fix update_model_documentation_updated_at
DROP FUNCTION IF EXISTS update_model_documentation_updated_at() CASCADE;
CREATE OR REPLACE FUNCTION update_model_documentation_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Recreate trigger for model_documentation
CREATE TRIGGER update_model_documentation_updated_at_trigger
BEFORE UPDATE ON model_documentation
FOR EACH ROW
EXECUTE FUNCTION update_model_documentation_updated_at();

-- Fix update_blog_updated_at
DROP FUNCTION IF EXISTS update_blog_updated_at() CASCADE;
CREATE OR REPLACE FUNCTION update_blog_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate trigger for blog_posts
CREATE TRIGGER update_blog_updated_at_trigger
BEFORE UPDATE ON blog_posts
FOR EACH ROW
EXECUTE FUNCTION update_blog_updated_at();

-- Fix update_updated_at (generic)
DROP FUNCTION IF EXISTS update_updated_at() CASCADE;
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Recreate triggers for tables using update_updated_at
CREATE TRIGGER update_app_settings_updated_at
BEFORE UPDATE ON app_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_content_templates_updated_at
BEFORE UPDATE ON content_templates
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_ai_models_updated_at
BEFORE UPDATE ON ai_models
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();