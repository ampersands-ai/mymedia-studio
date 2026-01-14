-- Step 1: Add blackboard_scene_id column to generations table
ALTER TABLE public.generations 
  ADD COLUMN IF NOT EXISTS blackboard_scene_id UUID REFERENCES public.blackboard_scenes(id) ON DELETE SET NULL;

-- Create partial index for efficient lookups (only index rows that have a scene ID)
CREATE INDEX IF NOT EXISTS idx_generations_blackboard_scene_id 
  ON public.generations(blackboard_scene_id) 
  WHERE blackboard_scene_id IS NOT NULL;

-- Step 2: Create trigger function to sync generation results to blackboard_scenes
CREATE OR REPLACE FUNCTION public.sync_generation_to_blackboard_scene()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if generation is completed with storage_path and linked to a scene
  IF NEW.status = 'completed' 
     AND NEW.storage_path IS NOT NULL 
     AND NEW.blackboard_scene_id IS NOT NULL 
     AND (OLD.status IS DISTINCT FROM 'completed' OR OLD.storage_path IS NULL)
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
  
  -- Handle failures - update scene status to failed
  IF NEW.status = 'failed' 
     AND NEW.blackboard_scene_id IS NOT NULL 
     AND OLD.status IS DISTINCT FROM 'failed'
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Step 3: Create the trigger (drop first if exists to avoid duplicates)
DROP TRIGGER IF EXISTS trigger_sync_generation_to_blackboard ON public.generations;

CREATE TRIGGER trigger_sync_generation_to_blackboard
  AFTER UPDATE ON public.generations
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_generation_to_blackboard_scene();

-- Step 4: Enable Realtime on blackboard_scenes table
ALTER PUBLICATION supabase_realtime ADD TABLE public.blackboard_scenes;