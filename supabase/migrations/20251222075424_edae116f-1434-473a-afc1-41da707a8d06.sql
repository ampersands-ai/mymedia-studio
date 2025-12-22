-- Create animation_projects table for storing editor projects
CREATE TABLE public.animation_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Untitled Project',
  instructions JSONB NOT NULL DEFAULT '{}',
  audio_url TEXT,
  audio_duration NUMERIC,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.animation_projects ENABLE ROW LEVEL SECURITY;

-- Create policies for user-owned projects
CREATE POLICY "Users can view their own animation projects"
  ON public.animation_projects
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own animation projects"
  ON public.animation_projects
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own animation projects"
  ON public.animation_projects
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own animation projects"
  ON public.animation_projects
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_animation_project_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_animation_projects_updated_at
  BEFORE UPDATE ON public.animation_projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_animation_project_updated_at();

-- Create index for faster user queries
CREATE INDEX idx_animation_projects_user_id ON public.animation_projects(user_id);
CREATE INDEX idx_animation_projects_updated_at ON public.animation_projects(updated_at DESC);