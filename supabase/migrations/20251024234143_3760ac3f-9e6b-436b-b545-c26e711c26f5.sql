-- Allow authenticated users to read video assets (voiceovers, final videos)
CREATE POLICY "Authenticated users can read video assets"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'video-assets');

-- Allow service role to insert video assets (needed for edge functions)
CREATE POLICY "Service role can insert video assets"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'video-assets');