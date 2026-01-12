-- Add background_mode column to video_jobs table
ALTER TABLE video_jobs ADD COLUMN IF NOT EXISTS background_mode text DEFAULT 'stock';

-- Add comment for documentation
COMMENT ON COLUMN video_jobs.background_mode IS 'Background media source: stock (Pixabay) or ai_generated (JSON2Video AI generation)';