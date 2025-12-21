-- Create video_editor_jobs table for the video editor feature
CREATE TABLE public.video_editor_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'uploading', 'queued', 'fetching', 'rendering', 'saving', 'done', 'failed')),
  clips JSONB DEFAULT '[]'::jsonb,
  audio_track JSONB DEFAULT NULL,
  subtitle_config JSONB DEFAULT NULL,
  output_settings JSONB DEFAULT '{"aspectRatio": "16:9", "format": "mp4", "backgroundColor": "#000000"}'::jsonb,
  shotstack_render_id TEXT,
  final_video_url TEXT,
  total_duration NUMERIC DEFAULT 0,
  cost_credits NUMERIC DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for user queries
CREATE INDEX idx_video_editor_jobs_user_id ON public.video_editor_jobs(user_id);
CREATE INDEX idx_video_editor_jobs_status ON public.video_editor_jobs(status);
CREATE INDEX idx_video_editor_jobs_created_at ON public.video_editor_jobs(created_at DESC);

-- Enable RLS
ALTER TABLE public.video_editor_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own jobs
CREATE POLICY "Users can view their own video editor jobs"
  ON public.video_editor_jobs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own video editor jobs"
  ON public.video_editor_jobs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own video editor jobs"
  ON public.video_editor_jobs
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own video editor jobs"
  ON public.video_editor_jobs
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_video_editor_jobs_updated_at
  BEFORE UPDATE ON public.video_editor_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for status updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_editor_jobs;