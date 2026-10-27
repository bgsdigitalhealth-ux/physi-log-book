-- Faculty and administrators both manage academic batches (create, edit, delete).
DROP POLICY IF EXISTS "Admin writes batches" ON public.batches;

CREATE POLICY "Faculty and admin manage batches"
  ON public.batches
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'faculty') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'faculty') OR public.has_role(auth.uid(), 'admin'));