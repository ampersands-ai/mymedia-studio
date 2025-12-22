-- Update rate_limit_tiers to use actual subscription plan names
-- Current tiers: basic, pro, enterprise, freemium
-- Actual plans: freemium, explorer, professional, studio, ultimate

-- First, delete existing mismatched tiers (except freemium which is correct)
DELETE FROM rate_limit_tiers WHERE tier IN ('basic', 'pro', 'enterprise');

-- Insert correct tier mappings with appropriate limits
-- freemium already exists with correct name, but let's ensure proper values
UPDATE rate_limit_tiers 
SET max_concurrent_generations = 1, max_generations_per_hour = 10 
WHERE tier = 'freemium';

-- Add explorer tier (replaces basic)
INSERT INTO rate_limit_tiers (tier, max_concurrent_generations, max_generations_per_hour)
VALUES ('explorer', 3, 50)
ON CONFLICT (tier) DO UPDATE SET 
  max_concurrent_generations = EXCLUDED.max_concurrent_generations,
  max_generations_per_hour = EXCLUDED.max_generations_per_hour;

-- Add professional tier (replaces pro)
INSERT INTO rate_limit_tiers (tier, max_concurrent_generations, max_generations_per_hour)
VALUES ('professional', 5, 100)
ON CONFLICT (tier) DO UPDATE SET 
  max_concurrent_generations = EXCLUDED.max_concurrent_generations,
  max_generations_per_hour = EXCLUDED.max_generations_per_hour;

-- Add studio tier (replaces enterprise)
INSERT INTO rate_limit_tiers (tier, max_concurrent_generations, max_generations_per_hour)
VALUES ('studio', 10, 200)
ON CONFLICT (tier) DO UPDATE SET 
  max_concurrent_generations = EXCLUDED.max_concurrent_generations,
  max_generations_per_hour = EXCLUDED.max_generations_per_hour;

-- Add ultimate tier (new)
INSERT INTO rate_limit_tiers (tier, max_concurrent_generations, max_generations_per_hour)
VALUES ('ultimate', 20, 500)
ON CONFLICT (tier) DO UPDATE SET 
  max_concurrent_generations = EXCLUDED.max_concurrent_generations,
  max_generations_per_hour = EXCLUDED.max_generations_per_hour;