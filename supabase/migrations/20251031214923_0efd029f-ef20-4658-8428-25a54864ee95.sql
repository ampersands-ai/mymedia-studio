-- Add performance indexes for storyboard video management
CREATE INDEX IF NOT EXISTS idx_storyboards_storage_path 
ON public.storyboards(video_storage_path) 
WHERE video_storage_path IS NOT NULL AND status = 'complete';

CREATE INDEX IF NOT EXISTS idx_storyboards_needs_migration
ON public.storyboards(status, video_url, video_storage_path)
WHERE status = 'complete' AND video_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_generations_storyboard_id
ON public.generations((settings->>'storyboard_id'))
WHERE settings->>'storyboard_id' IS NOT NULL;