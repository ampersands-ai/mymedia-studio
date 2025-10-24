-- PHASE 1: Faceless Video Creator - Database & Storage Setup
-- This is completely isolated from existing generation system

-- Create video_jobs table
CREATE TABLE video_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Status with specific video workflow states
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN (
      'pending', 
      'generating_script', 
      'generating_voice', 
      'fetching_video', 
      'assembling', 
      'completed', 
      'failed'
    )),
  
  -- Input parameters
  topic TEXT NOT NULL CHECK (length(topic) >= 5 AND length(topic) <= 500),
  duration INTEGER NOT NULL DEFAULT 60 CHECK (duration >= 30 AND duration <= 90),
  style TEXT NOT NULL DEFAULT 'modern' CHECK (style IN ('modern', 'tech', 'educational', 'dramatic')),
  voice_id TEXT NOT NULL DEFAULT '21m00Tcm4TlvDq8ikWAM',
  
  -- Generated assets (URLs to storage)
  script TEXT,
  voiceover_url TEXT,
  background_video_url TEXT,
  
  -- Final output
  final_video_url TEXT,
  shotstack_render_id TEXT,
  
  -- Metadata
  renderer TEXT NOT NULL DEFAULT 'shotstack',
  cost_tokens INTEGER NOT NULL DEFAULT 15 CHECK (cost_tokens > 0),
  error_message TEXT,
  error_details JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_completion CHECK (
    (status = 'completed' AND completed_at IS NOT NULL AND final_video_url IS NOT NULL) OR
    (status != 'completed')
  )
);

-- Performance indexes
CREATE INDEX idx_video_jobs_user_created ON video_jobs(user_id, created_at DESC);
CREATE INDEX idx_video_jobs_status ON video_jobs(status) 
  WHERE status IN ('pending', 'generating_script', 'generating_voice', 'fetching_video', 'assembling');
CREATE INDEX idx_video_jobs_completed ON video_jobs(user_id, completed_at DESC) 
  WHERE status = 'completed';

-- Enable RLS
ALTER TABLE video_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own video jobs" 
  ON video_jobs FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own video jobs" 
  ON video_jobs FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all jobs
CREATE POLICY "Admins can view all video jobs" 
  ON video_jobs FOR SELECT 
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Update trigger for updated_at
CREATE TRIGGER update_video_jobs_updated_at
  BEFORE UPDATE ON video_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Enable realtime for status updates
ALTER PUBLICATION supabase_realtime ADD TABLE video_jobs;

-- Create video-assets storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
  'video-assets', 
  'video-assets', 
  false, 
  10485760, -- 10MB limit for audio files
  ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav']
);

-- RLS for storage bucket
CREATE POLICY "Users can upload own voiceovers"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'video-assets' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can read own voiceovers"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'video-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Service role full access to video-assets"
  ON storage.objects FOR ALL
  TO service_role
  USING (bucket_id = 'video-assets')
  WITH CHECK (bucket_id = 'video-assets');