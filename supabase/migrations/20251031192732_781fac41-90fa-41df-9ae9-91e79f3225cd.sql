-- Drop the old integer version of increment_tokens to resolve RPC ambiguity
DROP FUNCTION IF EXISTS public.increment_tokens(uuid, integer);