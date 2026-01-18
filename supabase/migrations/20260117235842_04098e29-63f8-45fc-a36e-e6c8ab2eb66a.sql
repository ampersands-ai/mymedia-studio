-- Create user_audio_library table for storing generated audio
CREATE TABLE public.user_audio_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  artist TEXT DEFAULT 'AI Studio',
  duration INTEGER NOT NULL DEFAULT 0,
  audio_url TEXT,
  storage_path TEXT,
  artwork_url TEXT,
  type TEXT NOT NULL CHECK (type IN ('song', 'voiceover', 'sfx', 'stem')),
  genre TEXT,
  mood TEXT,
  prompt TEXT,
  settings JSONB DEFAULT '{}',
  is_liked BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT false,
  play_count INTEGER DEFAULT 0,
  file_size_bytes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.user_audio_library ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own audio" 
ON public.user_audio_library 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can view public audio" 
ON public.user_audio_library 
FOR SELECT 
USING (is_public = true);

CREATE POLICY "Users can create their own audio" 
ON public.user_audio_library 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own audio" 
ON public.user_audio_library 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own audio" 
ON public.user_audio_library 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_user_audio_library_user_id ON public.user_audio_library(user_id);
CREATE INDEX idx_user_audio_library_type ON public.user_audio_library(type);
CREATE INDEX idx_user_audio_library_created_at ON public.user_audio_library(created_at DESC);
CREATE INDEX idx_user_audio_library_is_liked ON public.user_audio_library(user_id, is_liked) WHERE is_liked = true;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_audio_library_updated_at
BEFORE UPDATE ON public.user_audio_library
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for audio files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('audio-library', 'audio-library', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for audio uploads
CREATE POLICY "Users can view audio files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'audio-library');

CREATE POLICY "Users can upload their own audio" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'audio-library' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own audio files" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'audio-library' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own audio files" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'audio-library' AND auth.uid()::text = (storage.foldername(name))[1]);