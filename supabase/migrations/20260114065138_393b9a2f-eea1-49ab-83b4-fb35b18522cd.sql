-- Part 1: Update the trigger function to handle both INSERT and UPDATE operations
CREATE OR REPLACE FUNCTION public.sync_generation_to_blackboard_scene()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Handle completions (both INSERT and UPDATE)
  IF NEW.status = 'completed' 
     AND NEW.storage_path IS NOT NULL 
     AND NEW.blackboard_scene_id IS NOT NULL 
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'completed' OR OLD.storage_path IS NULL)
  THEN
    IF NEW.type = 'image' THEN
      UPDATE public.blackboard_scenes SET
        generated_image_url = NEW.storage_path,
        image_generation_status = 'complete',
        updated_at = NOW()
      WHERE id = NEW.blackboard_scene_id;
    ELSIF NEW.type = 'video' THEN
      UPDATE public.blackboard_scenes SET
        generated_video_url = NEW.storage_path,
        video_generation_status = 'complete',
        updated_at = NOW()
      WHERE id = NEW.blackboard_scene_id;
    END IF;
  END IF;
  
  -- Handle failures
  IF NEW.status = 'failed' 
     AND NEW.blackboard_scene_id IS NOT NULL 
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'failed')
  THEN
    IF NEW.type = 'image' THEN
      UPDATE public.blackboard_scenes SET
        image_generation_status = 'failed',
        updated_at = NOW()
      WHERE id = NEW.blackboard_scene_id;
    ELSIF NEW.type = 'video' THEN
      UPDATE public.blackboard_scenes SET
        video_generation_status = 'failed',
        updated_at = NOW()
      WHERE id = NEW.blackboard_scene_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Part 1b: Add AFTER INSERT trigger for direct completions
DROP TRIGGER IF EXISTS trigger_sync_generation_to_blackboard_insert ON public.generations;

CREATE TRIGGER trigger_sync_generation_to_blackboard_insert
AFTER INSERT ON public.generations
FOR EACH ROW
WHEN (NEW.status = 'completed' 
      AND NEW.storage_path IS NOT NULL 
      AND NEW.blackboard_scene_id IS NOT NULL)
EXECUTE FUNCTION sync_generation_to_blackboard_scene();