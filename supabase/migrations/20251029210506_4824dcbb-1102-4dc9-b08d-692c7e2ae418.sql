-- Create storyboards table
CREATE TABLE IF NOT EXISTS public.storyboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL CHECK (length(topic) >= 5 AND length(topic) <= 500),
  duration INTEGER NOT NULL CHECK (duration IN (30, 60, 90, 120)),
  style TEXT NOT NULL CHECK (style IN ('hyper-realistic', 'cinematic', 'animated', 'cartoon', 'natural', 'sketch')),
  tone TEXT NOT NULL CHECK (tone IN ('engaging', 'educational', 'dramatic', 'humorous', 'mysterious')),
  voice_id TEXT NOT NULL,
  voice_name TEXT NOT NULL,
  intro_image_prompt TEXT,
  intro_voiceover_text TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'rendering', 'complete', 'failed')),
  template_id TEXT,
  video_url TEXT,
  video_storage_path TEXT,
  render_job_id TEXT,
  tokens_cost INTEGER DEFAULT 0,
  estimated_render_cost INTEGER DEFAULT 800,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Create storyboard_scenes table
CREATE TABLE IF NOT EXISTS public.storyboard_scenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storyboard_id UUID NOT NULL REFERENCES public.storyboards(id) ON DELETE CASCADE,
  order_number INTEGER NOT NULL,
  voice_over_text TEXT NOT NULL CHECK (length(voice_over_text) >= 1 AND length(voice_over_text) <= 1000),
  image_prompt TEXT NOT NULL CHECK (length(image_prompt) >= 10 AND length(image_prompt) <= 2000),
  image_preview_url TEXT,
  is_edited BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(storyboard_id, order_number)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_storyboards_user_created ON public.storyboards(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_storyboards_status ON public.storyboards(status);
CREATE INDEX IF NOT EXISTS idx_storyboard_scenes_storyboard ON public.storyboard_scenes(storyboard_id, order_number);

-- Enable RLS
ALTER TABLE public.storyboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storyboard_scenes ENABLE ROW LEVEL SECURITY;

-- Storyboards RLS policies
CREATE POLICY "Users can view own storyboards"
  ON public.storyboards FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own storyboards"
  ON public.storyboards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own storyboards"
  ON public.storyboards FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own storyboards"
  ON public.storyboards FOR DELETE
  USING (auth.uid() = user_id);

-- Storyboard scenes RLS policies
CREATE POLICY "Users can view scenes of own storyboards"
  ON public.storyboard_scenes FOR SELECT
  USING (storyboard_id IN (SELECT id FROM public.storyboards WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert scenes for own storyboards"
  ON public.storyboard_scenes FOR INSERT
  WITH CHECK (storyboard_id IN (SELECT id FROM public.storyboards WHERE user_id = auth.uid()));

CREATE POLICY "Users can update scenes of own storyboards"
  ON public.storyboard_scenes FOR UPDATE
  USING (storyboard_id IN (SELECT id FROM public.storyboards WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete scenes of own storyboards"
  ON public.storyboard_scenes FOR DELETE
  USING (storyboard_id IN (SELECT id FROM public.storyboards WHERE user_id = auth.uid()));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.storyboards;
ALTER PUBLICATION supabase_realtime ADD TABLE public.storyboard_scenes;

-- Add trigger for updated_at
CREATE TRIGGER update_storyboards_updated_at
  BEFORE UPDATE ON public.storyboards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_storyboard_scenes_updated_at
  BEFORE UPDATE ON public.storyboard_scenes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();