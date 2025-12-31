-- Drop the policy that depends on device_id column
DROP POLICY IF EXISTS "Anonymous device consent allowed" ON public.user_consent_records;

-- Drop raw sensitive columns now that hashing is complete
ALTER TABLE public.user_consent_records
  DROP COLUMN IF EXISTS device_id CASCADE,
  DROP COLUMN IF EXISTS ip_address CASCADE,
  DROP COLUMN IF EXISTS user_agent CASCADE;