-- Fix the increment_model_page_view_count function to set search_path for security
CREATE OR REPLACE FUNCTION public.increment_model_page_view_count(page_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.model_pages 
  SET view_count = view_count + 1 
  WHERE id = page_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;