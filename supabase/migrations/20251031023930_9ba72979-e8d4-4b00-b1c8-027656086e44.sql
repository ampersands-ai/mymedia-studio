-- Create azure_voices table for managing TTS voices
CREATE TABLE azure_voices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voice_id text NOT NULL UNIQUE,
  voice_name text NOT NULL,
  language text NOT NULL,
  country text NOT NULL,
  language_code text NOT NULL,
  provider text NOT NULL DEFAULT 'azure',
  
  -- Tagging system (JSONB for flexibility)
  tags jsonb DEFAULT '{}',
  
  -- Preview management
  preview_url text,
  has_preview boolean DEFAULT false,
  
  -- Status
  is_active boolean DEFAULT true,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  display_order integer DEFAULT 0,
  description text,
  
  UNIQUE(voice_id, provider)
);

-- Indexes for performance
CREATE INDEX idx_azure_voices_language ON azure_voices(language);
CREATE INDEX idx_azure_voices_country ON azure_voices(country);
CREATE INDEX idx_azure_voices_active ON azure_voices(is_active);
CREATE INDEX idx_azure_voices_tags ON azure_voices USING gin(tags);
CREATE INDEX idx_azure_voices_provider ON azure_voices(provider);

-- RLS Policies
ALTER TABLE azure_voices ENABLE ROW LEVEL SECURITY;

-- Anyone can view active voices
CREATE POLICY "Anyone can view active voices"
ON azure_voices FOR SELECT
USING (is_active = true);

-- Admins can manage all voices
CREATE POLICY "Admins can manage voices"
ON azure_voices FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Add voice_provider column to storyboards table
ALTER TABLE storyboards
ADD COLUMN IF NOT EXISTS voice_provider text DEFAULT 'elevenlabs';

-- Backfill existing records
UPDATE storyboards 
SET voice_provider = 'elevenlabs' 
WHERE voice_provider IS NULL;