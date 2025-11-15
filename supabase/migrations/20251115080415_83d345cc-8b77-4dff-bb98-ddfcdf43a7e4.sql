-- Add INSERT policies for user_activity_logs table

-- Allow authenticated users to insert their own activity logs
CREATE POLICY "Users can insert own activity logs"
ON public.user_activity_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow anonymous users to insert activity logs with null user_id
CREATE POLICY "Anonymous users can insert activity logs"
ON public.user_activity_logs
FOR INSERT
TO anon
WITH CHECK (user_id IS NULL);

-- Allow service role to insert any activity logs (for edge functions)
CREATE POLICY "Service role can insert activity logs"
ON public.user_activity_logs
FOR INSERT
TO service_role
WITH CHECK (true);