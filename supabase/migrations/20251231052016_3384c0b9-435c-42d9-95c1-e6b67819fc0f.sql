-- =====================================================
-- ATOMIC RATE LIMITER FUNCTION
-- Production-grade rate limiting with advisory locks
-- Eliminates TOCTOU race conditions
-- =====================================================

-- Function to atomically check and update rate limits
CREATE OR REPLACE FUNCTION public.check_rate_limit_atomic(
  p_key TEXT,
  p_max_requests INTEGER,
  p_window_ms BIGINT,
  p_block_duration_ms BIGINT
)
RETURNS TABLE(
  allowed BOOLEAN,
  remaining INTEGER,
  reset_at TIMESTAMPTZ,
  retry_after_ms BIGINT,
  current_count INTEGER,
  blocked BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now BIGINT := EXTRACT(EPOCH FROM NOW()) * 1000;
  v_window_start BIGINT := v_now - p_window_ms;
  v_record rate_limits_v2%ROWTYPE;
  v_valid_timestamps BIGINT[];
  v_new_timestamps BIGINT[];
  v_count INTEGER;
  v_blocked_until TIMESTAMPTZ;
  v_is_blocked BOOLEAN := FALSE;
BEGIN
  -- Acquire advisory lock for this specific key to prevent race conditions
  -- Uses a hash of the key to create a unique lock ID
  PERFORM pg_advisory_xact_lock(hashtext(p_key));
  
  -- Get existing record
  SELECT * INTO v_record
  FROM rate_limits_v2
  WHERE key = p_key;
  
  -- Check if currently blocked
  IF v_record.blocked_until IS NOT NULL AND v_record.blocked_until > NOW() THEN
    RETURN QUERY SELECT 
      FALSE::BOOLEAN,
      0::INTEGER,
      v_record.blocked_until,
      (EXTRACT(EPOCH FROM v_record.blocked_until) * 1000 - v_now)::BIGINT,
      COALESCE(v_record.request_count, 0)::INTEGER,
      TRUE::BOOLEAN;
    RETURN;
  END IF;
  
  -- If blocked_until has passed, clear it
  IF v_record.blocked_until IS NOT NULL AND v_record.blocked_until <= NOW() THEN
    v_record.blocked_until := NULL;
  END IF;
  
  -- Filter timestamps to only include those within the sliding window
  IF v_record.request_timestamps IS NOT NULL THEN
    SELECT ARRAY_AGG(ts)
    INTO v_valid_timestamps
    FROM UNNEST(v_record.request_timestamps) AS ts
    WHERE ts > v_window_start;
  END IF;
  
  -- Handle NULL case
  IF v_valid_timestamps IS NULL THEN
    v_valid_timestamps := ARRAY[]::BIGINT[];
  END IF;
  
  v_count := COALESCE(array_length(v_valid_timestamps, 1), 0);
  
  -- Check if at or over the limit
  IF v_count >= p_max_requests THEN
    -- Block the user
    v_blocked_until := NOW() + (p_block_duration_ms || ' milliseconds')::INTERVAL;
    
    -- Update the record with block
    INSERT INTO rate_limits_v2 (key, request_count, request_timestamps, window_start, last_request_at, blocked_until)
    VALUES (p_key, v_count, v_valid_timestamps, NOW(), NOW(), v_blocked_until)
    ON CONFLICT (key) DO UPDATE SET
      blocked_until = v_blocked_until,
      updated_at = NOW();
    
    RETURN QUERY SELECT 
      FALSE::BOOLEAN,
      0::INTEGER,
      v_blocked_until,
      p_block_duration_ms,
      v_count,
      TRUE::BOOLEAN;
    RETURN;
  END IF;
  
  -- Add current timestamp
  v_new_timestamps := v_valid_timestamps || v_now;
  v_count := array_length(v_new_timestamps, 1);
  
  -- Upsert the record atomically
  INSERT INTO rate_limits_v2 (key, request_count, request_timestamps, window_start, last_request_at, blocked_until)
  VALUES (p_key, v_count, v_new_timestamps, NOW(), NOW(), NULL)
  ON CONFLICT (key) DO UPDATE SET
    request_count = v_count,
    request_timestamps = v_new_timestamps,
    last_request_at = NOW(),
    blocked_until = NULL,
    updated_at = NOW();
  
  -- Return success
  RETURN QUERY SELECT 
    TRUE::BOOLEAN,
    (p_max_requests - v_count)::INTEGER,
    (NOW() + (p_window_ms || ' milliseconds')::INTERVAL)::TIMESTAMPTZ,
    0::BIGINT,
    v_count,
    FALSE::BOOLEAN;
END;
$$;

-- Function to reset rate limit for a specific key (admin use)
CREATE OR REPLACE FUNCTION public.reset_rate_limit(p_key TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM rate_limits_v2 WHERE key = p_key;
  RETURN TRUE;
END;
$$;

-- Function to reset rate limits for a user (by user ID pattern)
CREATE OR REPLACE FUNCTION public.reset_user_rate_limits(p_user_id TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM rate_limits_v2 
  WHERE key LIKE '%' || p_user_id || '%';
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- Clear all existing rate limit records to start fresh
-- This removes any corrupted state from the race condition bug
TRUNCATE rate_limits_v2;

-- Add index for faster key lookups if not exists
CREATE INDEX IF NOT EXISTS idx_rate_limits_v2_key_lookup ON rate_limits_v2(key);

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.check_rate_limit_atomic TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.reset_rate_limit TO service_role;
GRANT EXECUTE ON FUNCTION public.reset_user_rate_limits TO service_role;