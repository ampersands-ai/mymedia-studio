-- =====================================================
-- Privacy-Focused User Refactor Migration (Fixed)
-- =====================================================

-- Step 1: Drop existing function to allow return type change
DROP FUNCTION IF EXISTS public.search_admin_users(text,text,text,text,boolean,text,text,integer,integer);

-- Step 2: Recreate search_admin_users function with profile_name instead of full_name
CREATE OR REPLACE FUNCTION public.search_admin_users(
  search_term text DEFAULT NULL::text, 
  filter_plan text DEFAULT NULL::text, 
  filter_status text DEFAULT NULL::text, 
  filter_role text DEFAULT NULL::text, 
  filter_email_verified boolean DEFAULT NULL::boolean, 
  sort_column text DEFAULT 'created_at'::text, 
  sort_direction text DEFAULT 'desc'::text, 
  page_offset integer DEFAULT 0, 
  page_limit integer DEFAULT 50
)
RETURNS TABLE(
  id uuid, 
  email text, 
  profile_name text, 
  email_verified boolean, 
  created_at timestamp with time zone, 
  last_activity_at timestamp with time zone, 
  plan text, 
  subscription_status text, 
  tokens_remaining numeric, 
  tokens_total numeric, 
  is_admin boolean, 
  is_mod_exempt boolean, 
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
     p.profile_name ILIKE '%' || search_term || '%')
    AND (filter_plan IS NULL OR filter_plan = '' OR us.plan::text = filter_plan)
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
    p.profile_name,
    p.email_verified,
    p.created_at,
    p.last_activity_at,
    us.plan::text,
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
     p.profile_name ILIKE '%' || search_term || '%')
    AND (filter_plan IS NULL OR filter_plan = '' OR us.plan::text = filter_plan)
    AND (filter_status IS NULL OR filter_status = '' OR us.status = filter_status)
    AND (filter_role IS NULL OR filter_role = '' OR 
         (filter_role = 'admin' AND ur.role = 'admin') OR
         (filter_role = 'user' AND (ur.role IS NULL OR ur.role != 'admin')))
    AND (filter_email_verified IS NULL OR p.email_verified = filter_email_verified)
  GROUP BY p.id, p.email, p.profile_name, p.email_verified, p.created_at, p.last_activity_at,
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