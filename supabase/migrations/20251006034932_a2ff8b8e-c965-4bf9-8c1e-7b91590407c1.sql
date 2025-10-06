-- Enable RLS on rate_limit_tiers table
ALTER TABLE public.rate_limit_tiers ENABLE ROW LEVEL SECURITY;

-- Allow all users to read tier configurations
CREATE POLICY "Anyone can view rate limit tiers"
ON public.rate_limit_tiers
FOR SELECT
USING (true);

-- Only admins can manage tiers
CREATE POLICY "Admins can manage rate limit tiers"
ON public.rate_limit_tiers
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));