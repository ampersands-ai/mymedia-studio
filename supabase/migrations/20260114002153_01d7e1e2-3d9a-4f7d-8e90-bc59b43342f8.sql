-- Blackboard storyboard parent table
CREATE TABLE public.blackboard_storyboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  aspect_ratio TEXT DEFAULT 'hd',
  video_model_type TEXT DEFAULT 'first_last_frames',
  final_video_url TEXT,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Blackboard scenes table
CREATE TABLE public.blackboard_scenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storyboard_id UUID NOT NULL REFERENCES public.blackboard_storyboards(id) ON DELETE CASCADE,
  order_number INTEGER NOT NULL,
  image_prompt TEXT DEFAULT '',
  generated_image_url TEXT,
  image_generation_status TEXT DEFAULT 'idle',
  video_prompt TEXT DEFAULT '',
  generated_video_url TEXT,
  video_generation_status TEXT DEFAULT 'idle',
  use_previous_image_as_seed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.blackboard_storyboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blackboard_scenes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for blackboard_storyboards
CREATE POLICY "Users can view their own blackboard storyboards"
  ON public.blackboard_storyboards FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own blackboard storyboards"
  ON public.blackboard_storyboards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own blackboard storyboards"
  ON public.blackboard_storyboards FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own blackboard storyboards"
  ON public.blackboard_storyboards FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for blackboard_scenes (join through storyboard ownership)
CREATE POLICY "Users can view their own blackboard scenes"
  ON public.blackboard_scenes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.blackboard_storyboards 
    WHERE id = storyboard_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can create their own blackboard scenes"
  ON public.blackboard_scenes FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.blackboard_storyboards 
    WHERE id = storyboard_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can update their own blackboard scenes"
  ON public.blackboard_scenes FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.blackboard_storyboards 
    WHERE id = storyboard_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their own blackboard scenes"
  ON public.blackboard_scenes FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.blackboard_storyboards 
    WHERE id = storyboard_id AND user_id = auth.uid()
  ));

-- Indexes for performance
CREATE INDEX idx_blackboard_storyboards_user_id ON public.blackboard_storyboards(user_id);
CREATE INDEX idx_blackboard_scenes_storyboard_id ON public.blackboard_scenes(storyboard_id);
CREATE INDEX idx_blackboard_scenes_order ON public.blackboard_scenes(storyboard_id, order_number);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_blackboard_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_blackboard_storyboards_updated_at
  BEFORE UPDATE ON public.blackboard_storyboards
  FOR EACH ROW EXECUTE FUNCTION public.update_blackboard_updated_at();

CREATE TRIGGER update_blackboard_scenes_updated_at
  BEFORE UPDATE ON public.blackboard_scenes
  FOR EACH ROW EXECUTE FUNCTION public.update_blackboard_updated_at();