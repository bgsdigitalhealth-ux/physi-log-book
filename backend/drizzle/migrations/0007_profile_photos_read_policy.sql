CREATE POLICY "Authenticated read profile photos" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'profile-photos');