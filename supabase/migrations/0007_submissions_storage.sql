-- Assignment submission files. Path convention: "<student_id>/<lesson_id>/<filename>".

insert into storage.buckets (id, name, public)
values ('submissions', 'submissions', false)
on conflict (id) do nothing;

drop policy if exists "submissions_owner_write" on storage.objects;
create policy "submissions_owner_write" on storage.objects for insert
  with check (bucket_id = 'submissions' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "submissions_owner_read" on storage.objects;
create policy "submissions_owner_read" on storage.objects for select
  using (bucket_id = 'submissions' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "submissions_admin_read" on storage.objects;
create policy "submissions_admin_read" on storage.objects for select
  using (bucket_id = 'submissions' and is_admin());

drop policy if exists "submissions_instructor_read" on storage.objects;
create policy "submissions_instructor_read" on storage.objects for select
  using (
    bucket_id = 'submissions'
    and is_instructor_of_course((
      select w.course_id from lessons l
      join modules m on m.id = l.module_id
      join weeks w on w.id = m.week_id
      where l.id = ((storage.foldername(name))[2])::uuid
    ))
  );
