-- Allow share links for storyboard renders by adding storyboard_id reference
ALTER TABLE public.share_tokens
ADD COLUMN IF NOT EXISTS storyboard_id uuid;

-- Foreign key to storyboards
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'share_tokens_storyboard_id_fkey'
  ) THEN
    ALTER TABLE public.share_tokens
    ADD CONSTRAINT share_tokens_storyboard_id_fkey
    FOREIGN KEY (storyboard_id)
    REFERENCES public.storyboards(id)
    ON DELETE CASCADE;
  END IF;
END $$;

-- Replace the existing valid_reference constraint to also allow storyboard_id
ALTER TABLE public.share_tokens
DROP CONSTRAINT IF EXISTS valid_reference;

ALTER TABLE public.share_tokens
ADD CONSTRAINT valid_reference
CHECK (
  (
    (CASE WHEN generation_id IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN video_job_id IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN storyboard_id IS NOT NULL THEN 1 ELSE 0 END)
  ) = 1
);