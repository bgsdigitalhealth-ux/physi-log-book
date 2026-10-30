create policy "Students upload own attachments" on storage.objects
for insert to authenticated
with check (bucket_id = 'submission-attachments' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Students update own attachments" on storage.objects
for update to authenticated
using (bucket_id = 'submission-attachments' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'submission-attachments' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Students delete own attachments" on storage.objects
for delete to authenticated
using (bucket_id = 'submission-attachments' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Read submission attachments" on storage.objects
for select to authenticated
using (
  bucket_id = 'submission-attachments'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.has_role(auth.uid(), 'faculty')
    or public.has_role(auth.uid(), 'admin')
  )
);