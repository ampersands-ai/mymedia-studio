-- Fix the increment_model_page_view_count function to bypass RLS
-- by using SECURITY DEFINER (runs as function owner, not caller)
CREATE OR REPLACE FUNCTION increment_model_page_view_count(page_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE model_pages 
  SET view_count = view_count + 1 
  WHERE id = page_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to all users (including anonymous)
GRANT EXECUTE ON FUNCTION increment_model_page_view_count(UUID) TO anon, authenticated;