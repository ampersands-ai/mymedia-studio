-- Add DELETE policy for admins to complete RLS coverage
CREATE POLICY "Admins can delete alerts"
ON public.admin_realtime_alerts FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));