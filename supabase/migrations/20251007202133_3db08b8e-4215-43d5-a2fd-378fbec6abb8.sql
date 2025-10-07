-- Create community_creations table to track shared generations
CREATE TABLE public.community_creations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id uuid NOT NULL REFERENCES public.generations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model_id text NOT NULL,
  model_record_id uuid REFERENCES public.ai_models(record_id),
  parameters jsonb NOT NULL DEFAULT '{}'::jsonb,
  prompt text NOT NULL,
  output_url text,
  content_type text NOT NULL,
  is_featured boolean DEFAULT false,
  views_count integer DEFAULT 0,
  likes_count integer DEFAULT 0,
  shared_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(generation_id)
);

-- Enable RLS
ALTER TABLE public.community_creations ENABLE ROW LEVEL SECURITY;

-- Anyone can view community creations
CREATE POLICY "Anyone can view community creations"
ON public.community_creations
FOR SELECT
USING (true);

-- Admins can manage all community creations
CREATE POLICY "Admins can manage community creations"
ON public.community_creations
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Users can share their own generations
CREATE POLICY "Users can share own generations"
ON public.community_creations
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.generations
    WHERE id = generation_id AND user_id = auth.uid()
  )
);

-- Create index for faster queries
CREATE INDEX idx_community_creations_model ON public.community_creations(model_id);
CREATE INDEX idx_community_creations_featured ON public.community_creations(is_featured) WHERE is_featured = true;
CREATE INDEX idx_community_creations_shared_at ON public.community_creations(shared_at DESC);