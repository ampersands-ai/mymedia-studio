-- Create video_editor_assets table for persistent media storage
CREATE TABLE IF NOT EXISTS public.video_editor_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('video', 'image', 'audio')),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration NUMERIC,
  width INTEGER,
  height INTEGER,
  size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.video_editor_assets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own video editor assets"
  ON public.video_editor_assets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own video editor assets"
  ON public.video_editor_assets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own video editor assets"
  ON public.video_editor_assets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own video editor assets"
  ON public.video_editor_assets FOR DELETE
  USING (auth.uid() = user_id);

-- Index for fast user lookups
CREATE INDEX idx_video_editor_assets_user_id ON public.video_editor_assets(user_id);

-- Trigger for updated_at
CREATE TRIGGER update_video_editor_assets_updated_at
  BEFORE UPDATE ON public.video_editor_assets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();