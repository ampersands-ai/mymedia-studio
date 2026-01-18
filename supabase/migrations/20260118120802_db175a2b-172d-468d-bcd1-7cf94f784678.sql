-- Create audio-uploads bucket for STT file uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio-uploads', 'audio-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload audio files
CREATE POLICY "Authenticated users can upload audio files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'audio-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to read their own audio files
CREATE POLICY "Users can read their own audio uploads"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'audio-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow public access to audio files (needed for Kie.ai to fetch)
CREATE POLICY "Public read access to audio uploads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'audio-uploads');

-- Allow users to delete their own audio files
CREATE POLICY "Users can delete their own audio uploads"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'audio-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);