-- Course materials (documents, images) storage. Unlike avatars, this bucket
-- is NOT public — course content is paid, so files are only reachable
-- through short-lived signed URLs generated after an app-level access check.
--
-- Object paths are structured as "<course_id>/<lesson_id>/<filename>" so
-- storage policies can reuse the same enrollment/instructor checks as the
-- rest of the schema, just by reading the first path segment as course_id.

insert into storage.buckets (id, name, public)
values ('course-materials', 'course-materials', false)
on conflict (id) do nothing;

drop policy if exists "course_materials_admin_all" on storage.objects;
create policy "course_materials_admin_all" on storage.objects for all
  using (bucket_id = 'course-materials' and is_admin())
  with check (bucket_id = 'course-materials' and is_admin());

drop policy if exists "course_materials_instructor_all" on storage.objects;
create policy "course_materials_instructor_all" on storage.objects for all
  using (
    bucket_id = 'course-materials'
    and is_instructor_of_course(((storage.foldername(name))[1])::uuid)
  )
  with check (
    bucket_id = 'course-materials'
    and is_instructor_of_course(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "course_materials_student_read" on storage.objects;
create policy "course_materials_student_read" on storage.objects for select
  using (
    bucket_id = 'course-materials'
    and is_enrolled_in_course(((storage.foldername(name))[1])::uuid)
  );
