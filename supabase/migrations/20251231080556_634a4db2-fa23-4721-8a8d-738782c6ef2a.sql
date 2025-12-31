-- Phase 2: Add missing consent management database objects
-- This fixes the manage-consent edge function failures

-- 1. Create consent_types reference table if not exists
CREATE TABLE IF NOT EXISTS public.consent_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_required BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default consent types
INSERT INTO public.consent_types (id, name, description, is_required, display_order) VALUES
  ('essential', 'Essential Cookies', 'Required for basic site functionality', TRUE, 1),
  ('analytics', 'Analytics', 'Help us understand how you use our site', FALSE, 2),
  ('marketing', 'Marketing', 'Used for targeted advertising', FALSE, 3)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on consent_types (public read, admin write)
ALTER TABLE public.consent_types ENABLE ROW LEVEL SECURITY;

-- Anyone can read consent types
CREATE POLICY "consent_types_public_read" ON public.consent_types
  FOR SELECT USING (true);

-- 2. Create consent_audit_log table for immutable audit trail
CREATE TABLE IF NOT EXISTS public.consent_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  device_id_hash TEXT,
  consent_type TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('granted', 'revoked', 'updated')),
  previous_value BOOLEAN,
  new_value BOOLEAN NOT NULL,
  ip_hash TEXT,
  user_agent_hash TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_consent_audit_user_id ON public.consent_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_audit_device_id ON public.consent_audit_log(device_id_hash);
CREATE INDEX IF NOT EXISTS idx_consent_audit_created_at ON public.consent_audit_log(created_at DESC);

-- Enable RLS on consent_audit_log
ALTER TABLE public.consent_audit_log ENABLE ROW LEVEL SECURITY;

-- Users can view their own audit log
CREATE POLICY "consent_audit_user_read" ON public.consent_audit_log
  FOR SELECT USING (auth.uid() = user_id);

-- Insert is allowed via edge function (service role)
CREATE POLICY "consent_audit_service_insert" ON public.consent_audit_log
  FOR INSERT WITH CHECK (true);

-- 3. Add missing columns to user_consent_records if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'user_consent_records' 
                 AND column_name = 'device_id_hash') THEN
    ALTER TABLE public.user_consent_records ADD COLUMN device_id_hash TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'user_consent_records' 
                 AND column_name = 'ip_hash') THEN
    ALTER TABLE public.user_consent_records ADD COLUMN ip_hash TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'user_consent_records' 
                 AND column_name = 'user_agent_hash') THEN
    ALTER TABLE public.user_consent_records ADD COLUMN user_agent_hash TEXT;
  END IF;
END $$;

-- Create index on device_id_hash for faster anonymous consent lookups
CREATE INDEX IF NOT EXISTS idx_user_consent_device_id_hash ON public.user_consent_records(device_id_hash);

-- 4. Create migrate_anonymous_consent function
CREATE OR REPLACE FUNCTION public.migrate_anonymous_consent(
  p_user_id UUID,
  p_device_id_hash TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  migrated_count INTEGER := 0;
BEGIN
  -- Update any anonymous consent records with matching device_id_hash to be owned by this user
  UPDATE public.user_consent_records
  SET user_id = p_user_id,
      updated_at = NOW()
  WHERE device_id_hash = p_device_id_hash
    AND user_id IS NULL;
  
  GET DIAGNOSTICS migrated_count = ROW_COUNT;
  
  RETURN migrated_count;
END;
$$;