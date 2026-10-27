CREATE TABLE public.viva_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  question text NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.viva_questions TO authenticated;
GRANT ALL ON public.viva_questions TO service_role;
ALTER TABLE public.viva_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read viva questions" ON public.viva_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Faculty and admin manage viva questions" ON public.viva_questions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'faculty') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'faculty') OR public.has_role(auth.uid(),'admin'));
ALTER PUBLICATION supabase_realtime ADD TABLE public.viva_questions;