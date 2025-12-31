-- Enable RLS on user_consent_records if not already enabled
ALTER TABLE public.user_consent_records ENABLE ROW LEVEL SECURITY;

-- Drop any existing permissive policies
DROP POLICY IF EXISTS "Allow public read access" ON public.user_consent_records;
DROP POLICY IF EXISTS "Allow public insert" ON public.user_consent_records;
DROP POLICY IF EXISTS "Anyone can read consent records" ON public.user_consent_records;
DROP POLICY IF EXISTS "Anyone can insert consent records" ON public.user_consent_records;

-- Create policy: Users can only view their own consent records (authenticated by user_id)
CREATE POLICY "Users can view own consent records"
ON public.user_consent_records
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Create policy: Users can only view their own consent records by device_id (for anonymous users)
-- This allows anonymous users to see their own records via device_id match
CREATE POLICY "Device owners can view own consent records"
ON public.user_consent_records
FOR SELECT
TO anon
USING (false); -- Block anonymous read access entirely - privacy data should not be exposed

-- Create policy: Authenticated users can insert their own consent records
CREATE POLICY "Users can insert own consent records"
ON public.user_consent_records
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Create policy: Allow anonymous users to insert consent records (for cookie consent before login)
-- This is needed for GDPR compliance to record consent before authentication
CREATE POLICY "Anonymous users can insert consent records"
ON public.user_consent_records
FOR INSERT
TO anon
WITH CHECK (user_id IS NULL);

-- Create policy: Users can update their own consent records
CREATE POLICY "Users can update own consent records"
ON public.user_consent_records
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create policy: Users can delete their own consent records (GDPR right to erasure)
CREATE POLICY "Users can delete own consent records"
ON public.user_consent_records
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);