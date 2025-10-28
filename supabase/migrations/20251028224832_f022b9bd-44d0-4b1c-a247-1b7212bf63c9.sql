-- Add UPDATE policy to allow users to update their own video jobs
CREATE POLICY "Users can update own video jobs"
ON video_jobs
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);