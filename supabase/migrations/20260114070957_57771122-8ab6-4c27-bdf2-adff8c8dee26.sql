
-- Fix trigger to use output_url (full URL) instead of storage_path (partial path)
CREATE OR REPLACE FUNCTION public.sync_generation_to_blackboard_scene()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Handle completions (both INSERT and UPDATE)
  -- Use output_url which contains the full URL, not storage_path which is just the path
  IF NEW.status = 'completed' 
     AND NEW.output_url IS NOT NULL 
     AND NEW.blackboard_scene_id IS NOT NULL 
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'completed' OR OLD.output_url IS NULL)
  THEN
    IF NEW.type = 'image' THEN
      UPDATE public.blackboard_scenes SET
        generated_image_url = NEW.output_url,
        image_generation_status = 'complete',
        updated_at = NOW()
      WHERE id = NEW.blackboard_scene_id;
    ELSIF NEW.type = 'video' THEN
      UPDATE public.blackboard_scenes SET
        generated_video_url = NEW.output_url,
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

-- Update INSERT trigger condition to check output_url instead of storage_path
DROP TRIGGER IF EXISTS trigger_sync_generation_to_blackboard_insert ON public.generations;
CREATE TRIGGER trigger_sync_generation_to_blackboard_insert
AFTER INSERT ON public.generations
FOR EACH ROW
WHEN (NEW.status = 'completed' 
      AND NEW.output_url IS NOT NULL 
      AND NEW.blackboard_scene_id IS NOT NULL)
EXECUTE FUNCTION sync_generation_to_blackboard_scene();
