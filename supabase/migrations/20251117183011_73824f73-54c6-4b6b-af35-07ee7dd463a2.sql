-- Function to notify when generation completes
CREATE OR REPLACE FUNCTION notify_generation_complete()
RETURNS TRIGGER AS $$
BEGIN
  -- Only notify on status change to completed
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    PERFORM pg_notify(
      'generation_complete',
      json_build_object(
        'user_id', NEW.user_id,
        'generation_id', NEW.id,
        'status', NEW.status,
        'output_url', NEW.output_url,
        'storage_path', NEW.storage_path
      )::text
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger on generations table
DROP TRIGGER IF EXISTS generation_complete_trigger ON generations;
CREATE TRIGGER generation_complete_trigger
  AFTER UPDATE ON generations
  FOR EACH ROW
  EXECUTE FUNCTION notify_generation_complete();