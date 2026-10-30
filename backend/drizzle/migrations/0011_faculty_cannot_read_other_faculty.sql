DROP POLICY IF EXISTS "Faculty and admin read profiles" ON public.profiles;
CREATE POLICY "Admin reads all profiles" ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Faculty read student profiles" ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'faculty') AND public.has_role(user_id, 'student')
         AND NOT public.has_role(user_id, 'faculty') AND NOT public.has_role(user_id, 'admin'));