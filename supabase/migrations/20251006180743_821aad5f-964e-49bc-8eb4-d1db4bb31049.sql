-- 1) Tighten profiles restrictive policy to require row ownership
DROP POLICY IF EXISTS "profiles_require_auth" ON public.profiles;
CREATE POLICY "profiles_require_ownership"
ON public.profiles
AS RESTRICTIVE
FOR ALL
TO public
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Keep permissive per-operation policies as-is (select/insert/update/delete own)

-- 2) Lock down audit_logs INSERT to service role only
DROP POLICY IF EXISTS "Allow service role to insert audit logs" ON public.audit_logs;
CREATE POLICY "Service role can insert audit logs"
ON public.audit_logs
FOR INSERT
TO service_role
WITH CHECK (true);

-- 3) Clarify and enforce user_sessions ownership + allow service role full control
DROP POLICY IF EXISTS "Service role manages sessions" ON public.user_sessions;
CREATE POLICY "Sessions require ownership"
ON public.user_sessions
AS RESTRICTIVE
FOR ALL
TO public
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role manages sessions"
ON public.user_sessions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
