-- Create a trigger function to sanitize sensitive headers from api_call_logs
CREATE OR REPLACE FUNCTION public.sanitize_api_call_headers()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sensitive_keys TEXT[] := ARRAY[
    'authorization', 'Authorization', 
    'api_key', 'api-key', 'apiKey', 'apikey',
    'x-api-key', 'X-Api-Key', 'X-API-KEY',
    'token', 'access_token', 'refresh_token',
    'secret', 'password', 'bearer',
    'x-auth-token', 'X-Auth-Token',
    'cookie', 'Cookie', 'set-cookie', 'Set-Cookie'
  ];
  key TEXT;
BEGIN
  -- Sanitize request_headers if present
  IF NEW.request_headers IS NOT NULL THEN
    FOREACH key IN ARRAY sensitive_keys
    LOOP
      IF NEW.request_headers ? key THEN
        NEW.request_headers = NEW.request_headers - key;
      END IF;
    END LOOP;
  END IF;
  
  -- Sanitize response_headers if present
  IF NEW.response_headers IS NOT NULL THEN
    FOREACH key IN ARRAY sensitive_keys
    LOOP
      IF NEW.response_headers ? key THEN
        NEW.response_headers = NEW.response_headers - key;
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to sanitize headers before insert
DROP TRIGGER IF EXISTS sanitize_api_call_headers_trigger ON public.api_call_logs;
CREATE TRIGGER sanitize_api_call_headers_trigger
  BEFORE INSERT OR UPDATE ON public.api_call_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.sanitize_api_call_headers();

-- Add comment for documentation
COMMENT ON FUNCTION public.sanitize_api_call_headers() IS 
'Automatically removes sensitive header values (API keys, tokens, secrets) from api_call_logs to prevent credential exposure';