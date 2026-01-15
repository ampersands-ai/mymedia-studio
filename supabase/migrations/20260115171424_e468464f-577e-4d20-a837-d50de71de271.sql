-- Remove hourly limits by setting them to 999999 (effectively unlimited)
UPDATE public.rate_limit_tiers SET max_generations_per_hour = 999999;