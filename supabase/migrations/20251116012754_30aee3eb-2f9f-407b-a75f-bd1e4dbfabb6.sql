-- Create model_documentation table for comprehensive API payload documentation
CREATE TABLE IF NOT EXISTS public.model_documentation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_record_id UUID NOT NULL REFERENCES public.ai_models(record_id) ON DELETE CASCADE,
  
  -- Basic metadata
  provider TEXT NOT NULL,
  model_id TEXT NOT NULL,
  model_name TEXT NOT NULL,
  content_type TEXT NOT NULL,
  model_family TEXT,
  
  -- Documentation content (JSONB for flexibility)
  documentation_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Analysis metadata
  analyzed_generations_count INTEGER DEFAULT 0,
  last_successful_generation_id UUID,
  last_analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Version control
  documentation_version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(model_record_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_model_docs_provider ON public.model_documentation(provider);
CREATE INDEX IF NOT EXISTS idx_model_docs_content_type ON public.model_documentation(content_type);
CREATE INDEX IF NOT EXISTS idx_model_docs_updated ON public.model_documentation(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_model_docs_model_family ON public.model_documentation(model_family);

-- Enable RLS
ALTER TABLE public.model_documentation ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Admins can manage all documentation
CREATE POLICY "Admins can view all model documentation"
  ON public.model_documentation
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert model documentation"
  ON public.model_documentation
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update model documentation"
  ON public.model_documentation
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete model documentation"
  ON public.model_documentation
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_model_documentation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_model_documentation_updated_at
  BEFORE UPDATE ON public.model_documentation
  FOR EACH ROW
  EXECUTE FUNCTION public.update_model_documentation_updated_at();