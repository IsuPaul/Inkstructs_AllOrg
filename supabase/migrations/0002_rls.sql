-- Row Level Security: the real access boundary.
-- Helper functions run as SECURITY DEFINER so policies can check role/enrollment
-- without recursive RLS lookups on profiles itself.

create or replace function auth_role()
returns user_role
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from profiles where id = auth.uid()), false);
$$;

create or replace function is_instructor_of_cohort(target_cohort_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from cohort_instructors
    where cohort_id = target_cohort_id and instructor_id = auth.uid()
  );
$$;

create or replace function is_instructor_of_course(target_course_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from cohort_instructors ci
    join cohorts c on c.id = ci.cohort_id
    where c.course_id = target_course_id and ci.instructor_id = auth.uid()
  );
$$;

create or replace function is_enrolled_in_course(target_course_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from enrollments e
    join cohorts c on c.id = e.cohort_id
    where c.course_id = target_course_id
      and e.student_id = auth.uid()
      and e.status in ('active', 'completed')
  );
$$;

create or replace function is_enrolled_in_cohort(target_cohort_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from enrollments
    where cohort_id = target_cohort_id
      and student_id = auth.uid()
      and status in ('active', 'completed')
  );
$$;

-- Enable RLS everywhere
alter table profiles enable row level security;
alter table applications enable row level security;
alter table courses enable row level security;
alter table weeks enable row level security;
alter table modules enable row level security;
alter table lessons enable row level security;
alter table assets enable row level security;
alter table cohorts enable row level security;
alter table cohort_instructors enable row level security;
alter table enrollments enable row level security;
alter table live_sessions enable row level security;
alter table lesson_progress enable row level security;
alter table module_progress enable row level security;
alter table submissions enable row level security;
alter table payments enable row level security;
alter table coupons enable row level security;
alter table certificates enable row level security;
alter table announcements enable row level security;

-- ---------- profiles ----------
drop policy if exists "profiles_select_self_or_admin" on profiles;
create policy "profiles_select_self_or_admin" on profiles for select
  using (id = auth.uid() or is_admin());
drop policy if exists "profiles_update_self" on profiles;
create policy "profiles_update_self" on profiles for update
  using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists "profiles_admin_all" on profiles;
create policy "profiles_admin_all" on profiles for all
  using (is_admin()) with check (is_admin());

-- ---------- applications ----------
drop policy if exists "applications_admin_all" on applications;
create policy "applications_admin_all" on applications for all
  using (is_admin()) with check (is_admin());
-- public can insert an application (the /apply form); no select/update for anon
drop policy if exists "applications_public_insert" on applications;
create policy "applications_public_insert" on applications for insert
  with check (true);

-- ---------- courses (published content readable by enrolled/instructor/admin) ----------
drop policy if exists "courses_admin_all" on courses;
create policy "courses_admin_all" on courses for all
  using (is_admin()) with check (is_admin());
drop policy if exists "courses_instructor_read" on courses;
create policy "courses_instructor_read" on courses for select
  using (is_instructor_of_course(id));
drop policy if exists "courses_student_read" on courses;
create policy "courses_student_read" on courses for select
  using (is_published and is_enrolled_in_course(id));
drop policy if exists "courses_public_catalogue" on courses;
create policy "courses_public_catalogue" on courses for select
  using (is_published);

-- ---------- weeks / modules / lessons (mirror course access) ----------
drop policy if exists "weeks_admin_all" on weeks;
create policy "weeks_admin_all" on weeks for all
  using (is_admin()) with check (is_admin());
drop policy if exists "weeks_instructor_read" on weeks;
create policy "weeks_instructor_read" on weeks for select
  using (is_instructor_of_course(course_id));
drop policy if exists "weeks_student_read" on weeks;
create policy "weeks_student_read" on weeks for select
  using (is_enrolled_in_course(course_id));

drop policy if exists "modules_admin_all" on modules;
create policy "modules_admin_all" on modules for all
  using (is_admin()) with check (is_admin());
drop policy if exists "modules_instructor_read" on modules;
create policy "modules_instructor_read" on modules for select
  using (is_instructor_of_course((select course_id from weeks where weeks.id = week_id)));
drop policy if exists "modules_student_read" on modules;
create policy "modules_student_read" on modules for select
  using (is_enrolled_in_course((select course_id from weeks where weeks.id = week_id)));

drop policy if exists "lessons_admin_all" on lessons;
create policy "lessons_admin_all" on lessons for all
  using (is_admin()) with check (is_admin());
drop policy if exists "lessons_instructor_all" on lessons;
create policy "lessons_instructor_all" on lessons for all
  using (is_instructor_of_course((select w.course_id from modules m join weeks w on w.id = m.week_id where m.id = module_id)))
  with check (is_instructor_of_course((select w.course_id from modules m join weeks w on w.id = m.week_id where m.id = module_id)));
drop policy if exists "lessons_student_read" on lessons;
create policy "lessons_student_read" on lessons for select
  using (is_enrolled_in_course((select w.course_id from modules m join weeks w on w.id = m.week_id where m.id = module_id)));

drop policy if exists "assets_admin_all" on assets;
create policy "assets_admin_all" on assets for all
  using (is_admin()) with check (is_admin());
drop policy if exists "assets_instructor_all" on assets;
create policy "assets_instructor_all" on assets for all
  using (is_instructor_of_course((select w.course_id from lessons l join modules m on m.id = l.module_id join weeks w on w.id = m.week_id where l.id = lesson_id)))
  with check (is_instructor_of_course((select w.course_id from lessons l join modules m on m.id = l.module_id join weeks w on w.id = m.week_id where l.id = lesson_id)));
drop policy if exists "assets_student_read" on assets;
create policy "assets_student_read" on assets for select
  using (is_enrolled_in_course((select w.course_id from lessons l join modules m on m.id = l.module_id join weeks w on w.id = m.week_id where l.id = lesson_id)));

-- ---------- cohorts ----------
drop policy if exists "cohorts_admin_all" on cohorts;
create policy "cohorts_admin_all" on cohorts for all
  using (is_admin()) with check (is_admin());
drop policy if exists "cohorts_instructor_read" on cohorts;
create policy "cohorts_instructor_read" on cohorts for select
  using (is_instructor_of_cohort(id));
drop policy if exists "cohorts_student_read" on cohorts;
create policy "cohorts_student_read" on cohorts for select
  using (is_enrolled_in_cohort(id));

drop policy if exists "cohort_instructors_admin_all" on cohort_instructors;
create policy "cohort_instructors_admin_all" on cohort_instructors for all
  using (is_admin()) with check (is_admin());
drop policy if exists "cohort_instructors_self_read" on cohort_instructors;
create policy "cohort_instructors_self_read" on cohort_instructors for select
  using (instructor_id = auth.uid());

-- ---------- enrollments ----------
drop policy if exists "enrollments_admin_all" on enrollments;
create policy "enrollments_admin_all" on enrollments for all
  using (is_admin()) with check (is_admin());
drop policy if exists "enrollments_student_read_own" on enrollments;
create policy "enrollments_student_read_own" on enrollments for select
  using (student_id = auth.uid());
drop policy if exists "enrollments_instructor_read" on enrollments;
create policy "enrollments_instructor_read" on enrollments for select
  using (is_instructor_of_cohort(cohort_id));

-- ---------- live sessions ----------
drop policy if exists "live_sessions_admin_all" on live_sessions;
create policy "live_sessions_admin_all" on live_sessions for all
  using (is_admin()) with check (is_admin());
drop policy if exists "live_sessions_instructor_all" on live_sessions;
create policy "live_sessions_instructor_all" on live_sessions for all
  using (is_instructor_of_cohort(cohort_id)) with check (is_instructor_of_cohort(cohort_id));
drop policy if exists "live_sessions_student_read" on live_sessions;
create policy "live_sessions_student_read" on live_sessions for select
  using (is_enrolled_in_cohort(cohort_id));

-- ---------- progress (write only own rows) ----------
drop policy if exists "lesson_progress_admin_all" on lesson_progress;
create policy "lesson_progress_admin_all" on lesson_progress for all
  using (is_admin()) with check (is_admin());
drop policy if exists "lesson_progress_self" on lesson_progress;
create policy "lesson_progress_self" on lesson_progress for all
  using (student_id = auth.uid()) with check (student_id = auth.uid());
drop policy if exists "lesson_progress_instructor_read" on lesson_progress;
create policy "lesson_progress_instructor_read" on lesson_progress for select
  using (is_instructor_of_course((select w.course_id from lessons l join modules m on m.id = l.module_id join weeks w on w.id = m.week_id where l.id = lesson_id)));

drop policy if exists "module_progress_admin_all" on module_progress;
create policy "module_progress_admin_all" on module_progress for all
  using (is_admin()) with check (is_admin());
drop policy if exists "module_progress_self_read" on module_progress;
create policy "module_progress_self_read" on module_progress for select
  using (student_id = auth.uid());
drop policy if exists "module_progress_instructor_read" on module_progress;
create policy "module_progress_instructor_read" on module_progress for select
  using (is_instructor_of_course((select w.course_id from modules m join weeks w on w.id = m.week_id where m.id = module_id)));
-- module_progress is written server-side only (trigger/service role), no direct student write policy

-- ---------- submissions ----------
drop policy if exists "submissions_admin_all" on submissions;
create policy "submissions_admin_all" on submissions for all
  using (is_admin()) with check (is_admin());
drop policy if exists "submissions_student_own" on submissions;
create policy "submissions_student_own" on submissions for select
  using (student_id = auth.uid());
drop policy if exists "submissions_student_insert" on submissions;
create policy "submissions_student_insert" on submissions for insert
  with check (student_id = auth.uid());
drop policy if exists "submissions_instructor_all" on submissions;
create policy "submissions_instructor_all" on submissions for all
  using (is_instructor_of_course((select w.course_id from lessons l join modules m on m.id = l.module_id join weeks w on w.id = m.week_id where l.id = lesson_id)))
  with check (is_instructor_of_course((select w.course_id from lessons l join modules m on m.id = l.module_id join weeks w on w.id = m.week_id where l.id = lesson_id)));

-- ---------- payments (server/service-role writes only; students read own) ----------
drop policy if exists "payments_admin_all" on payments;
create policy "payments_admin_all" on payments for all
  using (is_admin()) with check (is_admin());
drop policy if exists "payments_student_read_own" on payments;
create policy "payments_student_read_own" on payments for select
  using (exists (select 1 from enrollments e where e.id = enrollment_id and e.student_id = auth.uid()));

-- ---------- coupons ----------
drop policy if exists "coupons_admin_all" on coupons;
create policy "coupons_admin_all" on coupons for all
  using (is_admin()) with check (is_admin());

-- ---------- certificates ----------
drop policy if exists "certificates_admin_all" on certificates;
create policy "certificates_admin_all" on certificates for all
  using (is_admin()) with check (is_admin());
drop policy if exists "certificates_student_read_own" on certificates;
create policy "certificates_student_read_own" on certificates for select
  using (student_id = auth.uid());
-- verification page uses a service-role lookup by code, so no public policy needed

-- ---------- announcements ----------
drop policy if exists "announcements_admin_all" on announcements;
create policy "announcements_admin_all" on announcements for all
  using (is_admin()) with check (is_admin());
drop policy if exists "announcements_instructor_all" on announcements;
create policy "announcements_instructor_all" on announcements for all
  using (is_instructor_of_cohort(cohort_id)) with check (is_instructor_of_cohort(cohort_id));
drop policy if exists "announcements_student_read" on announcements;
create policy "announcements_student_read" on announcements for select
  using (is_enrolled_in_cohort(cohort_id));
