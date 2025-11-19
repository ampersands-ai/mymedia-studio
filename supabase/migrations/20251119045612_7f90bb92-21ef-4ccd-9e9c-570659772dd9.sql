-- Prevent input_schema modification on locked models
CREATE OR REPLACE FUNCTION public.prevent_locked_schema_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- If model is locked and input_schema is being changed, block it
  IF OLD.is_locked = true AND NEW.input_schema IS DISTINCT FROM OLD.input_schema THEN
    RAISE EXCEPTION 'Cannot modify input_schema of locked model (record_id: %). Unlock the model first.', OLD.record_id
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Attach trigger to ai_models table
DROP TRIGGER IF EXISTS prevent_locked_schema_modification_trigger ON public.ai_models;
CREATE TRIGGER prevent_locked_schema_modification_trigger
  BEFORE UPDATE ON public.ai_models
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_locked_schema_modification();