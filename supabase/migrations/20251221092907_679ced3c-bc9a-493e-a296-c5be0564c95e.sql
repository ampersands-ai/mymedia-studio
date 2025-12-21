-- Create the animation_jobs table
CREATE TABLE IF NOT EXISTS public.animation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Input data
  script TEXT NOT NULL,
  audio_url TEXT,
  duration INTEGER NOT NULL,
  style TEXT NOT NULL DEFAULT 'stick-figure',
  caption_style TEXT NOT NULL DEFAULT 'karaoke',
  background_type TEXT NOT NULL DEFAULT 'animated',
  background_url TEXT,
  overlay_type TEXT NOT NULL DEFAULT 'explainer',
  color_scheme JSONB DEFAULT '{"primary": "#22c55e", "secondary": "#94a3b8", "background": "#0f172a", "accent": "#f59e0b"}',

  -- Processing data
  status TEXT NOT NULL DEFAULT 'queued',
  scenes JSONB,
  video_config JSONB,

  -- Output
  video_url TEXT,

  -- Notifications
  webhook_url TEXT,
  callback_email TEXT,

  -- Cost tracking
  llm_cost DECIMAL(10, 6) DEFAULT 0,
  render_cost DECIMAL(10, 6) DEFAULT 0,
  render_progress INTEGER DEFAULT 0,

  -- Error handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  render_started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_animation_jobs_user_id ON public.animation_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_animation_jobs_status ON public.animation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_animation_jobs_user_status ON public.animation_jobs(user_id, status);

-- Enable RLS
ALTER TABLE public.animation_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own animation jobs" 
  ON public.animation_jobs FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own animation jobs" 
  ON public.animation_jobs FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own animation jobs" 
  ON public.animation_jobs FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Service role has full access" 
  ON public.animation_jobs FOR ALL 
  USING (auth.role() = 'service_role');

-- Auto-update timestamp trigger (reuse existing function)
CREATE TRIGGER update_animation_jobs_updated_at 
  BEFORE UPDATE ON public.animation_jobs 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for the table
ALTER PUBLICATION supabase_realtime ADD TABLE public.animation_jobs;