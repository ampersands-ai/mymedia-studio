-- Allow admins to view all generations
CREATE POLICY "Admins can view all generations"
ON public.generations
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admins to manage all generations
CREATE POLICY "Admins can manage all generations"
ON public.generations
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
);