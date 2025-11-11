-- Create table for saved caption presets
CREATE TABLE public.saved_caption_presets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  settings JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.saved_caption_presets ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own caption presets" 
ON public.saved_caption_presets 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own caption presets" 
ON public.saved_caption_presets 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own caption presets" 
ON public.saved_caption_presets 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for better query performance
CREATE INDEX idx_caption_presets_user_id ON public.saved_caption_presets(user_id);