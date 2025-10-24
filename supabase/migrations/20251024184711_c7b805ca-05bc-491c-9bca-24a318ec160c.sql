-- Create public storage bucket for voice previews
INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-previews', 'voice-previews', true);

-- Allow public read access to voice previews
CREATE POLICY "Voice previews are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'voice-previews');

-- Allow service role to upload voice previews
CREATE POLICY "Service role can upload voice previews"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'voice-previews');