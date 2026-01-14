-- Fix: Sync generation completions to blackboard_scenes on both INSERT and UPDATE

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_sync_generation_to_blackboard_insert ON public.generations;
DROP TRIGGER IF EXISTS trigger_sync_generation_to_blackboard_update ON public.generations;
DROP TRIGGER IF EXISTS trigger_sync_generation_to_blackboard ON public.generations;

-- Create INSERT trigger (for immediate completions)
CREATE TRIGGER trigger_sync_generation_to_blackboard_insert
AFTER INSERT ON public.generations
FOR EACH ROW
WHEN (NEW.status = 'completed' 
      AND NEW.output_url IS NOT NULL 
      AND NEW.blackboard_scene_id IS NOT NULL)
EXECUTE FUNCTION sync_generation_to_blackboard_scene();

-- Create UPDATE trigger (for async completions - most common case)
CREATE TRIGGER trigger_sync_generation_to_blackboard_update
AFTER UPDATE ON public.generations
FOR EACH ROW
WHEN (NEW.status = 'completed' 
      AND NEW.output_url IS NOT NULL 
      AND NEW.blackboard_scene_id IS NOT NULL
      AND (OLD.status IS DISTINCT FROM 'completed' OR OLD.output_url IS NULL))
EXECUTE FUNCTION sync_generation_to_blackboard_scene();

-- Backfill: Sync all existing completed video generations that weren't synced
UPDATE public.blackboard_scenes bs
SET 
  generated_video_url = g.output_url,
  video_generation_status = 'complete',
  updated_at = NOW()
FROM public.generations g
WHERE g.blackboard_scene_id = bs.id
  AND g.type = 'video'
  AND g.status = 'completed'
  AND g.output_url IS NOT NULL
  AND bs.generated_video_url IS NULL;

-- Also backfill any missing image generations
UPDATE public.blackboard_scenes bs
SET 
  generated_image_url = g.output_url,
  image_generation_status = 'complete',
  updated_at = NOW()
FROM public.generations g
WHERE g.blackboard_scene_id = bs.id
  AND g.type = 'image'
  AND g.status = 'completed'
  AND g.output_url IS NOT NULL
  AND bs.generated_image_url IS NULL;