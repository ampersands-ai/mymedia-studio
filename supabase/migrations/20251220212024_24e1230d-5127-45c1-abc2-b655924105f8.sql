-- =====================================================
-- PHASE 1: Payment Identifier Encryption Setup
-- =====================================================

-- Enable pgcrypto extension (may already be enabled)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================================================
-- 1.1 Create Encryption/Decryption Functions
-- =====================================================

-- Encrypt payment identifier using AES-256-CBC
CREATE OR REPLACE FUNCTION public.encrypt_payment_id(plaintext TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'vault'
AS $$
DECLARE
  encryption_key TEXT;
  key_bytes BYTEA;
  iv BYTEA;
  encrypted BYTEA;
BEGIN
  -- Return NULL if input is NULL
  IF plaintext IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Get encryption key from Vault
  SELECT decrypted_secret INTO encryption_key
  FROM vault.decrypted_secrets
  WHERE name = 'payment_identifier_encryption_key'
  LIMIT 1;
  
  -- If no key configured, log warning and return NULL (don't store plaintext)
  IF encryption_key IS NULL OR encryption_key = '' THEN
    RAISE WARNING 'payment_identifier_encryption_key not found in Vault - encryption not available';
    RETURN NULL;
  END IF;
  
  -- Generate random IV (16 bytes for AES)
  iv := gen_random_bytes(16);
  
  -- Create 32-byte key from secret using SHA-256
  key_bytes := digest(encryption_key, 'sha256');
  
  -- Encrypt using AES-256-CBC with PKCS padding
  encrypted := encrypt_iv(
    convert_to(plaintext, 'utf8'),
    key_bytes,
    iv,
    'aes-cbc/pad:pkcs'
  );
  
  -- Return IV + ciphertext as base64 (IV is prepended for decryption)
  RETURN encode(iv || encrypted, 'base64');
END;
$$;

-- Decrypt payment identifier
CREATE OR REPLACE FUNCTION public.decrypt_payment_id(ciphertext TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'vault'
AS $$
DECLARE
  encryption_key TEXT;
  key_bytes BYTEA;
  raw_data BYTEA;
  iv BYTEA;
  encrypted BYTEA;
  decrypted BYTEA;
BEGIN
  -- Return NULL if input is NULL
  IF ciphertext IS NULL OR ciphertext = '' THEN
    RETURN NULL;
  END IF;
  
  -- Get encryption key from Vault
  SELECT decrypted_secret INTO encryption_key
  FROM vault.decrypted_secrets
  WHERE name = 'payment_identifier_encryption_key'
  LIMIT 1;
  
  IF encryption_key IS NULL OR encryption_key = '' THEN
    RAISE WARNING 'payment_identifier_encryption_key not found in Vault - decryption not available';
    RETURN NULL;
  END IF;
  
  -- Decode base64
  raw_data := decode(ciphertext, 'base64');
  
  -- Extract IV (first 16 bytes) and ciphertext (rest)
  iv := substring(raw_data from 1 for 16);
  encrypted := substring(raw_data from 17);
  
  -- Create 32-byte key from secret using SHA-256
  key_bytes := digest(encryption_key, 'sha256');
  
  -- Decrypt
  decrypted := decrypt_iv(
    encrypted,
    key_bytes,
    iv,
    'aes-cbc/pad:pkcs'
  );
  
  RETURN convert_from(decrypted, 'utf8');
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't expose details
  RAISE WARNING 'Decryption failed for payment ID: %', SQLERRM;
  RETURN NULL;
END;
$$;

-- =====================================================
-- 1.2 Create Secure Query Functions for Lookups
-- =====================================================

-- Find user by encrypted Stripe customer ID (for webhook lookups)
CREATE OR REPLACE FUNCTION public.find_user_by_stripe_customer(p_customer_id TEXT)
RETURNS TABLE(user_id UUID, plan TEXT, tokens_remaining NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT us.user_id, us.plan::TEXT, us.tokens_remaining
  FROM user_subscriptions us
  WHERE decrypt_payment_id(us.stripe_customer_id_encrypted) = p_customer_id
     OR us.stripe_customer_id = p_customer_id; -- Fallback during migration
END;
$$;

-- Find user by encrypted Dodo customer ID (for webhook lookups)
CREATE OR REPLACE FUNCTION public.find_user_by_dodo_customer(p_customer_id TEXT)
RETURNS TABLE(user_id UUID, plan TEXT, tokens_remaining NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT us.user_id, us.plan::TEXT, us.tokens_remaining
  FROM user_subscriptions us
  WHERE decrypt_payment_id(us.dodo_customer_id_encrypted) = p_customer_id
     OR us.dodo_customer_id = p_customer_id; -- Fallback during migration
END;
$$;

-- Find user by encrypted Stripe subscription ID
CREATE OR REPLACE FUNCTION public.find_user_by_stripe_subscription(p_subscription_id TEXT)
RETURNS TABLE(user_id UUID, plan TEXT, tokens_remaining NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT us.user_id, us.plan::TEXT, us.tokens_remaining
  FROM user_subscriptions us
  WHERE decrypt_payment_id(us.stripe_subscription_id_encrypted) = p_subscription_id
     OR us.stripe_subscription_id = p_subscription_id; -- Fallback during migration
END;
$$;

-- =====================================================
-- 1.3 Add Encrypted Columns to user_subscriptions
-- =====================================================

ALTER TABLE public.user_subscriptions
ADD COLUMN IF NOT EXISTS stripe_customer_id_encrypted TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id_encrypted TEXT,
ADD COLUMN IF NOT EXISTS dodo_customer_id_encrypted TEXT,
ADD COLUMN IF NOT EXISTS dodo_subscription_id_encrypted TEXT;

-- =====================================================
-- 1.4 Create Trigger to Auto-Encrypt on Insert/Update
-- =====================================================

CREATE OR REPLACE FUNCTION public.encrypt_payment_ids_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Encrypt Stripe customer ID if changed
  IF NEW.stripe_customer_id IS NOT NULL AND 
     (OLD.stripe_customer_id IS NULL OR NEW.stripe_customer_id != OLD.stripe_customer_id) THEN
    NEW.stripe_customer_id_encrypted := encrypt_payment_id(NEW.stripe_customer_id);
  END IF;
  
  -- Encrypt Stripe subscription ID if changed
  IF NEW.stripe_subscription_id IS NOT NULL AND 
     (OLD.stripe_subscription_id IS NULL OR NEW.stripe_subscription_id != OLD.stripe_subscription_id) THEN
    NEW.stripe_subscription_id_encrypted := encrypt_payment_id(NEW.stripe_subscription_id);
  END IF;
  
  -- Encrypt Dodo customer ID if changed
  IF NEW.dodo_customer_id IS NOT NULL AND 
     (OLD.dodo_customer_id IS NULL OR NEW.dodo_customer_id != OLD.dodo_customer_id) THEN
    NEW.dodo_customer_id_encrypted := encrypt_payment_id(NEW.dodo_customer_id);
  END IF;
  
  -- Encrypt Dodo subscription ID if changed
  IF NEW.dodo_subscription_id IS NOT NULL AND 
     (OLD.dodo_subscription_id IS NULL OR NEW.dodo_subscription_id != OLD.dodo_subscription_id) THEN
    NEW.dodo_subscription_id_encrypted := encrypt_payment_id(NEW.dodo_subscription_id);
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS encrypt_payment_ids ON public.user_subscriptions;
CREATE TRIGGER encrypt_payment_ids
  BEFORE INSERT OR UPDATE ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION encrypt_payment_ids_trigger();

-- =====================================================
-- 1.5 Migrate Existing Plaintext Data to Encrypted
-- =====================================================

-- This will encrypt existing payment IDs (requires encryption key in Vault first)
UPDATE public.user_subscriptions
SET 
  stripe_customer_id_encrypted = encrypt_payment_id(stripe_customer_id),
  stripe_subscription_id_encrypted = encrypt_payment_id(stripe_subscription_id),
  dodo_customer_id_encrypted = encrypt_payment_id(dodo_customer_id),
  dodo_subscription_id_encrypted = encrypt_payment_id(dodo_subscription_id)
WHERE stripe_customer_id IS NOT NULL 
   OR stripe_subscription_id IS NOT NULL
   OR dodo_customer_id IS NOT NULL
   OR dodo_subscription_id IS NOT NULL;

-- =====================================================
-- PHASE 3: Audit Log Sanitization
-- =====================================================

-- Create trigger to sanitize audit log metadata before insert
CREATE OR REPLACE FUNCTION public.sanitize_audit_log_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  sensitive_keys TEXT[] := ARRAY[
    'stripe_customer_id', 'stripe_subscription_id',
    'dodo_customer_id', 'dodo_subscription_id',
    'customer_id', 'subscription_id', 'payment_id',
    'event', 'eventData', 'raw_event'
  ];
  key TEXT;
BEGIN
  -- If metadata contains sensitive keys, remove them
  IF NEW.metadata IS NOT NULL THEN
    FOREACH key IN ARRAY sensitive_keys
    LOOP
      IF NEW.metadata ? key THEN
        -- Replace with redacted indicator
        NEW.metadata := NEW.metadata - key;
        NEW.metadata := NEW.metadata || jsonb_build_object(key || '_redacted', true);
      END IF;
    END LOOP;
    
    -- Also sanitize nested 'event' object if present
    IF NEW.metadata ? 'event' AND jsonb_typeof(NEW.metadata->'event') = 'object' THEN
      NEW.metadata := NEW.metadata - 'event';
      NEW.metadata := NEW.metadata || jsonb_build_object('event_redacted', true);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sanitize_audit_log_on_insert ON public.audit_logs;
CREATE TRIGGER sanitize_audit_log_on_insert
  BEFORE INSERT ON public.audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION sanitize_audit_log_metadata();

-- =====================================================
-- PHASE 4: Monitoring Functions
-- =====================================================

-- Check if any plaintext payment IDs still exist (for security monitoring)
CREATE OR REPLACE FUNCTION public.check_plaintext_payment_ids()
RETURNS TABLE(
  check_name TEXT,
  has_plaintext BOOLEAN,
  plaintext_count BIGINT,
  encrypted_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Check Stripe customer IDs (plaintext starts with 'cus_')
  RETURN QUERY
  SELECT 
    'stripe_customer_id'::TEXT,
    EXISTS(SELECT 1 FROM user_subscriptions WHERE stripe_customer_id LIKE 'cus_%' AND stripe_customer_id_encrypted IS NULL),
    COUNT(*) FILTER (WHERE stripe_customer_id LIKE 'cus_%' AND stripe_customer_id_encrypted IS NULL),
    COUNT(*) FILTER (WHERE stripe_customer_id_encrypted IS NOT NULL)
  FROM user_subscriptions;
  
  -- Check Stripe subscription IDs (plaintext starts with 'sub_')
  RETURN QUERY
  SELECT 
    'stripe_subscription_id'::TEXT,
    EXISTS(SELECT 1 FROM user_subscriptions WHERE stripe_subscription_id LIKE 'sub_%' AND stripe_subscription_id_encrypted IS NULL),
    COUNT(*) FILTER (WHERE stripe_subscription_id LIKE 'sub_%' AND stripe_subscription_id_encrypted IS NULL),
    COUNT(*) FILTER (WHERE stripe_subscription_id_encrypted IS NOT NULL)
  FROM user_subscriptions;
  
  -- Check Dodo customer IDs
  RETURN QUERY
  SELECT 
    'dodo_customer_id'::TEXT,
    EXISTS(SELECT 1 FROM user_subscriptions WHERE dodo_customer_id IS NOT NULL AND dodo_customer_id_encrypted IS NULL),
    COUNT(*) FILTER (WHERE dodo_customer_id IS NOT NULL AND dodo_customer_id_encrypted IS NULL),
    COUNT(*) FILTER (WHERE dodo_customer_id_encrypted IS NOT NULL)
  FROM user_subscriptions;
  
  -- Check Dodo subscription IDs
  RETURN QUERY
  SELECT 
    'dodo_subscription_id'::TEXT,
    EXISTS(SELECT 1 FROM user_subscriptions WHERE dodo_subscription_id IS NOT NULL AND dodo_subscription_id_encrypted IS NULL),
    COUNT(*) FILTER (WHERE dodo_subscription_id IS NOT NULL AND dodo_subscription_id_encrypted IS NULL),
    COUNT(*) FILTER (WHERE dodo_subscription_id_encrypted IS NOT NULL)
  FROM user_subscriptions;
END;
$$;

-- Create decryption access audit log function
CREATE OR REPLACE FUNCTION public.log_payment_id_decryption(
  p_user_id UUID,
  p_field_name TEXT,
  p_reason TEXT DEFAULT 'webhook_lookup'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO audit_logs (user_id, action, resource_type, metadata)
  VALUES (
    p_user_id,
    'payment_id_decryption',
    'user_subscriptions',
    jsonb_build_object(
      'field', p_field_name,
      'reason', p_reason,
      'timestamp', now()
    )
  );
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION public.encrypt_payment_id IS 'Encrypts payment identifiers using AES-256-CBC with key from Vault. Returns base64-encoded IV+ciphertext.';
COMMENT ON FUNCTION public.decrypt_payment_id IS 'Decrypts payment identifiers encrypted by encrypt_payment_id(). Returns plaintext or NULL on failure.';
COMMENT ON FUNCTION public.check_plaintext_payment_ids IS 'Security monitoring: checks for any unencrypted payment IDs remaining in database.';