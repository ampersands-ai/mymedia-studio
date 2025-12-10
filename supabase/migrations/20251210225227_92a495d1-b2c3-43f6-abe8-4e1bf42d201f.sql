-- Create moderation exemptions table
CREATE TABLE public.moderation_exemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  granted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  granted_by UUID,
  reason TEXT,
  is_active BOOLEAN DEFAULT TRUE NOT NULL
);

-- Enable RLS
ALTER TABLE public.moderation_exemptions ENABLE ROW LEVEL SECURITY;

-- Admins can manage all exemptions
CREATE POLICY "Admins can manage exemptions"
ON public.moderation_exemptions
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Users can view their own exemption status
CREATE POLICY "Users can view own exemption"
ON public.moderation_exemptions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Security definer function for exemption check
CREATE OR REPLACE FUNCTION public.is_moderation_exempt(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.moderation_exemptions
    WHERE user_id = _user_id AND is_active = TRUE
  );
$$;