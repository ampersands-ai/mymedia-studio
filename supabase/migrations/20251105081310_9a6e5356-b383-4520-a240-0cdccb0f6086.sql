-- Create table for curated cinematic prompts
CREATE TABLE public.cinematic_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt text NOT NULL,
  category text NOT NULL,
  source text DEFAULT 'curated',
  quality_score integer DEFAULT 5,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT quality_score_range CHECK (quality_score >= 1 AND quality_score <= 5)
);

-- Create indexes for efficient querying
CREATE INDEX idx_cinematic_prompts_active ON public.cinematic_prompts(is_active, quality_score);
CREATE INDEX idx_cinematic_prompts_category ON public.cinematic_prompts(category);

-- Enable RLS
ALTER TABLE public.cinematic_prompts ENABLE ROW LEVEL SECURITY;

-- Anyone can read active prompts
CREATE POLICY "Active prompts are viewable by everyone"
  ON public.cinematic_prompts 
  FOR SELECT
  USING (is_active = true);

-- Only admins can manage prompts
CREATE POLICY "Admins can manage all prompts"
  ON public.cinematic_prompts 
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_cinematic_prompts_updated_at
  BEFORE UPDATE ON public.cinematic_prompts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();