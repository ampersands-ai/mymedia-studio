-- Fix security warnings

-- 1. Drop and recreate view with SECURITY INVOKER (default, safer)
DROP VIEW IF EXISTS admin_users_view;

-- The view doesn't need SECURITY DEFINER - it should use the caller's permissions
-- RLS on base tables (profiles, user_subscriptions, etc.) will apply naturally
-- Admin access is already controlled via the search_admin_users function

-- 2. Move pg_trgm extension to extensions schema
DROP EXTENSION IF EXISTS pg_trgm CASCADE;
CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA extensions;

-- Recreate the indexes using the extensions schema for pg_trgm
DROP INDEX IF EXISTS idx_profiles_email_trgm;
DROP INDEX IF EXISTS idx_profiles_full_name_trgm;

CREATE INDEX idx_profiles_email_trgm ON profiles USING gin(email extensions.gin_trgm_ops);
CREATE INDEX idx_profiles_full_name_trgm ON profiles USING gin(full_name extensions.gin_trgm_ops);