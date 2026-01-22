-- Create generation_ledger view for real-time admin access to all generations
CREATE OR REPLACE VIEW generation_ledger AS
SELECT 
  g.id AS artifio_id,
  g.user_id,
  p.email AS user_email,
  p.display_name AS user_name,
  g.provider_task_id,
  g.model_id,
  g.model_record_id,
  g.type AS content_type,
  g.status,
  COALESCE(g.tokens_used, 0) AS credits_cost,
  COALESCE(g.tokens_charged, 0) AS tokens_charged,
  CASE 
    WHEN g.output_url IS NOT NULL OR g.storage_path IS NOT NULL 
    THEN TRUE ELSE FALSE 
  END AS has_output,
  g.created_at AS run_date,
  g.completed_at,
  COALESCE(g.setup_duration_ms, 0) + COALESCE(g.api_duration_ms, 0) AS total_duration_ms,
  g.setup_duration_ms,
  g.api_duration_ms,
  g.prompt,
  g.output_url,
  g.storage_path
FROM generations g
LEFT JOIN profiles p ON p.id = g.user_id;

-- Create user_daily_snapshots table for historical daily aggregates
CREATE TABLE IF NOT EXISTS user_daily_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  
  -- Generation metrics
  total_generations INTEGER DEFAULT 0,
  successful_runs INTEGER DEFAULT 0,
  failed_runs INTEGER DEFAULT 0,
  pending_runs INTEGER DEFAULT 0,
  cancelled_runs INTEGER DEFAULT 0,
  
  -- Credit metrics  
  credits_used NUMERIC(12,2) DEFAULT 0,
  credits_refunded NUMERIC(12,2) DEFAULT 0,
  credits_remaining_eod NUMERIC(12,2) DEFAULT 0,
  
  -- Content breakdown
  images_generated INTEGER DEFAULT 0,
  videos_generated INTEGER DEFAULT 0,
  audio_generated INTEGER DEFAULT 0,
  
  -- Performance metrics
  avg_generation_time_ms INTEGER DEFAULT 0,
  total_processing_time_ms BIGINT DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, snapshot_date)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_user_daily_snapshots_user_date 
  ON user_daily_snapshots(user_id, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_user_daily_snapshots_date 
  ON user_daily_snapshots(snapshot_date DESC);

-- Enable RLS on user_daily_snapshots
ALTER TABLE user_daily_snapshots ENABLE ROW LEVEL SECURITY;

-- Admin-only SELECT policy for snapshots
CREATE POLICY "Admins view all snapshots" 
  ON user_daily_snapshots FOR SELECT 
  USING (has_role(auth.uid(), 'admin'));

-- Service role can manage all snapshots (for cron job)
CREATE POLICY "Service role manages snapshots" 
  ON user_daily_snapshots FOR ALL 
  USING (auth.jwt()->>'role' = 'service_role');

-- Trigger for updated_at
CREATE TRIGGER update_user_daily_snapshots_updated_at
  BEFORE UPDATE ON user_daily_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();