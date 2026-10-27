ALTER TABLE public.profiles ADD COLUMN gender text;
ALTER TABLE public.profiles ADD COLUMN photo_path text;
ALTER TABLE public.profiles ADD COLUMN is_held boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN hold_reason text;

CREATE POLICY "Faculty and admin update settings" ON public.app_settings
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'faculty'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'faculty'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.set_student_hold(_student_id uuid, _held boolean, _reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'faculty') OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Only faculty and administrators can hold student records.';
  END IF;
  UPDATE public.profiles
  SET is_held = _held,
      hold_reason = CASE WHEN _held THEN _reason ELSE NULL END
  WHERE user_id = _student_id;
END;
$$;

INSERT INTO public.app_settings (key, value)
VALUES ('submission_window', '{"start_date": null, "end_date": null}'::jsonb)
ON CONFLICT (key) DO NOTHING;

CREATE POLICY "Students upload own profile photo" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'profile-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Students update own profile photo" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'profile-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Students delete own profile photo" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'profile-photos' AND (storage.foldername(name))[1] = auth.uid()::text);