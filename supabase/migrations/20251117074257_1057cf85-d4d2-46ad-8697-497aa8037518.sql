-- Create atomic token deduction function with proper row-level locking
CREATE OR REPLACE FUNCTION deduct_user_tokens(
  p_user_id UUID,
  p_cost NUMERIC
) RETURNS TABLE (
  tokens_remaining NUMERIC,
  success BOOLEAN,
  error_message TEXT
) AS $$
DECLARE
  v_current_tokens NUMERIC;
  v_new_balance NUMERIC;
BEGIN
  -- Lock the row for update to prevent concurrent modifications
  SELECT user_subscriptions.tokens_remaining INTO v_current_tokens
  FROM user_subscriptions
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  -- Check if subscription exists
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::NUMERIC, FALSE, 'Subscription not found';
    RETURN;
  END IF;
  
  -- Check if sufficient tokens
  IF v_current_tokens < p_cost THEN
    RETURN QUERY SELECT v_current_tokens, FALSE, 'Insufficient tokens';
    RETURN;
  END IF;
  
  -- Calculate new balance
  v_new_balance := v_current_tokens - p_cost;
  
  -- Update the balance
  UPDATE user_subscriptions
  SET tokens_remaining = v_new_balance
  WHERE user_id = p_user_id;
  
  -- Return success with new balance
  RETURN QUERY SELECT v_new_balance, TRUE, NULL::TEXT;
END;
$$ LANGUAGE plpgsql;