-- Create or replace function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create table to track user consent (GDPR compliance)
CREATE TABLE public.user_consent_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    device_id TEXT,
    consent_type TEXT NOT NULL,
    consented BOOLEAN NOT NULL DEFAULT false,
    ip_address TEXT,
    user_agent TEXT,
    consented_at TIMESTAMP WITH TIME ZONE,
    withdrawn_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, consent_type),
    UNIQUE(device_id, consent_type)
);

-- Create table to track account deletion requests (GDPR compliance)
CREATE TABLE public.account_deletion_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    scheduled_deletion_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '7 days'),
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'cancelled', 'completed')),
    cancelled_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    deletion_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id)
);

-- Create table to track data export requests (GDPR compliance)
CREATE TABLE public.data_export_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'expired')),
    download_url TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    file_size_bytes BIGINT,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.user_consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_export_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_consent_records
CREATE POLICY "Users can view their own consent records"
ON public.user_consent_records FOR SELECT
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert their own consent records"
ON public.user_consent_records FOR INSERT
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own consent records"
ON public.user_consent_records FOR UPDATE
USING (auth.uid() = user_id OR user_id IS NULL);

-- RLS policies for account_deletion_requests
CREATE POLICY "Users can view their own deletion requests"
ON public.account_deletion_requests FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own deletion requests"
ON public.account_deletion_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own deletion requests"
ON public.account_deletion_requests FOR UPDATE
USING (auth.uid() = user_id);

-- RLS policies for data_export_requests
CREATE POLICY "Users can view their own export requests"
ON public.data_export_requests FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own export requests"
ON public.data_export_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create trigger for updated_at on user_consent_records
CREATE TRIGGER update_user_consent_records_updated_at
    BEFORE UPDATE ON public.user_consent_records
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();