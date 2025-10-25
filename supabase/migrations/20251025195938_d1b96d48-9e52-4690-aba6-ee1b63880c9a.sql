-- Create RPC functions for template landing pages

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_template_view_count(template_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE template_landing_pages
  SET view_count = view_count + 1
  WHERE id = template_id;
END;
$$;

-- Function to increment use count
CREATE OR REPLACE FUNCTION increment_template_use_count(template_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE template_landing_pages
  SET use_count = use_count + 1
  WHERE id = template_id;
END;
$$;