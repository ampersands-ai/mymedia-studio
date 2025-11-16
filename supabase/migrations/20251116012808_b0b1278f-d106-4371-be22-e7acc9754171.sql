-- Fix security warning: Set search_path for function
CREATE OR REPLACE FUNCTION public.update_model_documentation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public;