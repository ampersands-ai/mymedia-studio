-- Enable pg_trgm extension for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add indexes for search performance
CREATE INDEX IF NOT EXISTS idx_profiles_email_trgm ON profiles USING gin(email gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_profiles_full_name_trgm ON profiles USING gin(full_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at_desc ON profiles(created_at DESC);

-- Add last_activity tracking column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ;

-- Create index for last activity
CREATE INDEX IF NOT EXISTS idx_profiles_last_activity ON profiles(last_activity_at DESC NULLS LAST);

-- Create admin users view for efficient server-side joins
CREATE OR REPLACE VIEW admin_users_view AS
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.email_verified,
  p.created_at,
  p.last_activity_at,
  us.plan,
  us.status as subscription_status,
  us.tokens_remaining,
  us.tokens_total,
  COALESCE(bool_or(ur.role = 'admin'), false) as is_admin,
  COALESCE(bool_or(me.is_active), false) as is_mod_exempt
FROM profiles p
LEFT JOIN user_subscriptions us ON us.user_id = p.id
LEFT JOIN user_roles ur ON ur.user_id = p.id
LEFT JOIN moderation_exemptions me ON me.user_id = p.id AND me.is_active = true
GROUP BY p.id, p.email, p.full_name, p.email_verified, p.created_at, p.last_activity_at,
         us.plan, us.status, us.tokens_remaining, us.tokens_total;

-- Grant access to admin view for authenticated users (RLS will still apply on base tables)
GRANT SELECT ON admin_users_view TO authenticated;

-- Create function to update last_activity_at on generation
CREATE OR REPLACE FUNCTION update_user_last_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles 
  SET last_activity_at = NOW() 
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

-- Create trigger to update last_activity on generation insert
DROP TRIGGER IF EXISTS trigger_update_user_last_activity ON generations;
CREATE TRIGGER trigger_update_user_last_activity
  AFTER INSERT ON generations
  FOR EACH ROW
  EXECUTE FUNCTION update_user_last_activity();

-- Create function for paginated admin user search
CREATE OR REPLACE FUNCTION search_admin_users(
  search_term TEXT DEFAULT NULL,
  filter_plan TEXT DEFAULT NULL,
  filter_status TEXT DEFAULT NULL,
  filter_role TEXT DEFAULT NULL,
  filter_email_verified BOOLEAN DEFAULT NULL,
  sort_column TEXT DEFAULT 'created_at',
  sort_direction TEXT DEFAULT 'desc',
  page_offset INT DEFAULT 0,
  page_limit INT DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  email_verified BOOLEAN,
  created_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ,
  plan TEXT,
  subscription_status TEXT,
  tokens_remaining NUMERIC,
  tokens_total NUMERIC,
  is_admin BOOLEAN,
  is_mod_exempt BOOLEAN,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total BIGINT;
BEGIN
  -- Calculate total count with filters
  SELECT COUNT(DISTINCT p.id) INTO total
  FROM profiles p
  LEFT JOIN user_subscriptions us ON us.user_id = p.id
  LEFT JOIN user_roles ur ON ur.user_id = p.id
  LEFT JOIN moderation_exemptions me ON me.user_id = p.id AND me.is_active = true
  WHERE
    (search_term IS NULL OR search_term = '' OR 
     p.email ILIKE '%' || search_term || '%' OR 
     p.full_name ILIKE '%' || search_term || '%')
    AND (filter_plan IS NULL OR filter_plan = '' OR us.plan = filter_plan)
    AND (filter_status IS NULL OR filter_status = '' OR us.status = filter_status)
    AND (filter_role IS NULL OR filter_role = '' OR 
         (filter_role = 'admin' AND ur.role = 'admin') OR
         (filter_role = 'user' AND (ur.role IS NULL OR ur.role != 'admin')))
    AND (filter_email_verified IS NULL OR p.email_verified = filter_email_verified);

  -- Return paginated results with total count
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.full_name,
    p.email_verified,
    p.created_at,
    p.last_activity_at,
    us.plan,
    us.status as subscription_status,
    us.tokens_remaining,
    us.tokens_total,
    COALESCE(bool_or(ur.role = 'admin'), false) as is_admin,
    COALESCE(bool_or(me.is_active), false) as is_mod_exempt,
    total as total_count
  FROM profiles p
  LEFT JOIN user_subscriptions us ON us.user_id = p.id
  LEFT JOIN user_roles ur ON ur.user_id = p.id
  LEFT JOIN moderation_exemptions me ON me.user_id = p.id AND me.is_active = true
  WHERE
    (search_term IS NULL OR search_term = '' OR 
     p.email ILIKE '%' || search_term || '%' OR 
     p.full_name ILIKE '%' || search_term || '%')
    AND (filter_plan IS NULL OR filter_plan = '' OR us.plan = filter_plan)
    AND (filter_status IS NULL OR filter_status = '' OR us.status = filter_status)
    AND (filter_role IS NULL OR filter_role = '' OR 
         (filter_role = 'admin' AND ur.role = 'admin') OR
         (filter_role = 'user' AND (ur.role IS NULL OR ur.role != 'admin')))
    AND (filter_email_verified IS NULL OR p.email_verified = filter_email_verified)
  GROUP BY p.id, p.email, p.full_name, p.email_verified, p.created_at, p.last_activity_at,
           us.plan, us.status, us.tokens_remaining, us.tokens_total
  ORDER BY 
    CASE WHEN sort_column = 'created_at' AND sort_direction = 'desc' THEN p.created_at END DESC NULLS LAST,
    CASE WHEN sort_column = 'created_at' AND sort_direction = 'asc' THEN p.created_at END ASC NULLS LAST,
    CASE WHEN sort_column = 'email' AND sort_direction = 'desc' THEN p.email END DESC NULLS LAST,
    CASE WHEN sort_column = 'email' AND sort_direction = 'asc' THEN p.email END ASC NULLS LAST,
    CASE WHEN sort_column = 'tokens_remaining' AND sort_direction = 'desc' THEN us.tokens_remaining END DESC NULLS LAST,
    CASE WHEN sort_column = 'tokens_remaining' AND sort_direction = 'asc' THEN us.tokens_remaining END ASC NULLS LAST,
    CASE WHEN sort_column = 'last_activity_at' AND sort_direction = 'desc' THEN p.last_activity_at END DESC NULLS LAST,
    CASE WHEN sort_column = 'last_activity_at' AND sort_direction = 'asc' THEN p.last_activity_at END ASC NULLS LAST,
    p.created_at DESC
  LIMIT page_limit
  OFFSET page_offset;
END;
$$;

-- Create function to get user stats for admin dashboard
CREATE OR REPLACE FUNCTION get_admin_user_stats()
RETURNS TABLE (
  total_users BIGINT,
  active_users BIGINT,
  admin_count BIGINT,
  verified_users BIGINT,
  freemium_users BIGINT,
  premium_users BIGINT,
  pro_users BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT p.id) as total_users,
    COUNT(DISTINCT CASE WHEN us.status = 'active' THEN p.id END) as active_users,
    COUNT(DISTINCT CASE WHEN ur.role = 'admin' THEN p.id END) as admin_count,
    COUNT(DISTINCT CASE WHEN p.email_verified = true THEN p.id END) as verified_users,
    COUNT(DISTINCT CASE WHEN us.plan = 'freemium' OR us.plan IS NULL THEN p.id END) as freemium_users,
    COUNT(DISTINCT CASE WHEN us.plan = 'premium' THEN p.id END) as premium_users,
    COUNT(DISTINCT CASE WHEN us.plan = 'pro' THEN p.id END) as pro_users
  FROM profiles p
  LEFT JOIN user_subscriptions us ON us.user_id = p.id
  LEFT JOIN user_roles ur ON ur.user_id = p.id AND ur.role = 'admin';
END;
$$;