-- ========================================================================
-- Courses become a subset of cohorts: one cohort (an intake/batch) can
-- offer several courses, each with its own price, capacity and
-- instructors. A student enrolls in one specific course within a cohort,
-- not the cohort as a whole — so they only ever see that course's content,
-- even if other courses run under the same cohort.
--
-- "cohort_courses" is the new join: one row = "this course, offered in
-- this cohort, at this price." Everything that used to hang off a cohort
-- directly (enrollments, instructor assignments, live sessions,
-- announcements, certificates) now hangs off a cohort_course instead.
-- ========================================================================

create table if not exists cohort_courses (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references cohorts(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  price_kobo bigint not null default 0 check (price_kobo >= 0),
  currency text not null default 'NGN',
  capacity int,
  created_at timestamptz not null default now(),
  unique (cohort_id, course_id)
);

-- Backfill: every existing cohort had exactly one course, so this is a
-- clean 1:1 migration — one cohort_courses row per existing cohort,
-- carrying over its price/capacity.
insert into cohort_courses (cohort_id, course_id, price_kobo, currency, capacity, created_at)
select id, course_id, price_kobo, currency, capacity, created_at from cohorts
on conflict (cohort_id, course_id) do nothing;

-- Remove objects that depend on enrollments.cohort_id.
-- They are recreated later using cohort_course_id.

drop view if exists week_progress;
drop view if exists course_progress;

drop policy if exists "enrollments_admin_all" on enrollments;
drop policy if exists "enrollments_student_read_own" on enrollments;
drop policy if exists "enrollments_instructor_read" on enrollments;

drop policy if exists "cohorts_instructor_read" on cohorts;
drop policy if exists "cohorts_student_read" on cohorts;
drop policy if exists "cohorts_admin_all" on cohorts;

drop policy if exists "cohort_instructors_admin_all" on cohort_instructors;
drop policy if exists "cohort_instructors_self_read" on cohort_instructors;

drop policy if exists "live_sessions_admin_all" on live_sessions;
drop policy if exists "live_sessions_instructor_all" on live_sessions;
drop policy if exists "live_sessions_student_read" on live_sessions;

drop policy if exists "announcements_admin_all" on announcements;
drop policy if exists "announcements_instructor_all" on announcements;
drop policy if exists "announcements_student_read" on announcements;

-- ---------- Re-point dependent tables at cohort_courses ----------

alter table enrollments add column if not exists cohort_course_id uuid references cohort_courses(id) on delete cascade;
update enrollments e set cohort_course_id = cc.id
  from cohort_courses cc where cc.cohort_id = e.cohort_id and e.cohort_course_id is null;
alter table enrollments drop constraint if exists enrollments_cohort_id_fkey;
alter table enrollments drop constraint if exists enrollments_student_id_cohort_id_key;
alter table enrollments drop column if exists cohort_id;
alter table enrollments alter column cohort_course_id set not null;
do $$ begin
  alter table enrollments add constraint enrollments_student_cohort_course_unique unique (student_id, cohort_course_id);
exception when duplicate_object then null;
end $$;

alter table cohort_instructors add column if not exists cohort_course_id uuid references cohort_courses(id) on delete cascade;
update cohort_instructors ci set cohort_course_id = cc.id
  from cohort_courses cc where cc.cohort_id = ci.cohort_id and ci.cohort_course_id is null;
alter table cohort_instructors drop constraint if exists cohort_instructors_cohort_id_fkey;
alter table cohort_instructors drop constraint if exists cohort_instructors_pkey;
alter table cohort_instructors drop column if exists cohort_id;
alter table cohort_instructors alter column cohort_course_id set not null;
do $$ begin
  alter table cohort_instructors add primary key (cohort_course_id, instructor_id);
exception when invalid_table_definition then null;
end $$;

alter table live_sessions add column if not exists cohort_course_id uuid references cohort_courses(id) on delete cascade;
update live_sessions ls set cohort_course_id = cc.id
  from cohort_courses cc where cc.cohort_id = ls.cohort_id and ls.cohort_course_id is null;
alter table live_sessions drop constraint if exists live_sessions_cohort_id_fkey;
alter table live_sessions drop column if exists cohort_id;
alter table live_sessions alter column cohort_course_id set not null;

alter table announcements add column if not exists cohort_course_id uuid references cohort_courses(id) on delete cascade;
update announcements a set cohort_course_id = cc.id
  from cohort_courses cc where cc.cohort_id = a.cohort_id and a.cohort_course_id is null;
alter table announcements drop constraint if exists announcements_cohort_id_fkey;
alter table announcements drop column if exists cohort_id;
alter table announcements alter column cohort_course_id set not null;

alter table certificates add column if not exists cohort_course_id uuid references cohort_courses(id);
update certificates c set cohort_course_id = cc.id
  from cohort_courses cc where cc.cohort_id = c.cohort_id and c.cohort_course_id is null;
alter table certificates drop constraint if exists certificates_cohort_id_fkey;
alter table certificates drop column if exists cohort_id;

alter table applications add column if not exists cohort_course_id uuid references cohort_courses(id);
update applications ap set cohort_course_id = cc.id
  from cohort_courses cc where cc.cohort_id = ap.cohort_id and ap.cohort_course_id is null;
alter table applications drop constraint if exists applications_cohort_fk;
alter table applications drop column if exists cohort_id;

-- announcement_reads references announcements.id directly, unaffected.

-- ---------- Cohorts: now a course-less container (an intake/batch) ----------

alter table cohorts drop constraint if exists cohorts_course_id_fkey;
alter table cohorts drop column if exists course_id;
alter table cohorts drop column if exists price_kobo;
alter table cohorts drop column if exists currency;
alter table cohorts drop column if exists capacity;

-- ---------- Indexes ----------

create index if not exists idx_cohort_courses_cohort on cohort_courses(cohort_id);
create index if not exists idx_cohort_courses_course on cohort_courses(course_id);
create index if not exists idx_enrollments_cohort_course on enrollments(cohort_course_id);
create index if not exists idx_cohort_instructors_cohort_course on cohort_instructors(cohort_course_id);
create index if not exists idx_live_sessions_cohort_course on live_sessions(cohort_course_id);
create index if not exists idx_announcements_cohort_course on announcements(cohort_course_id);

-- ========================================================================
-- RLS: helper functions re-pointed at cohort_courses
-- ========================================================================

create or replace function is_instructor_of_course(target_course_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from cohort_instructors ci
    join cohort_courses cc on cc.id = ci.cohort_course_id
    where cc.course_id = target_course_id and ci.instructor_id = auth.uid()
  );
$$;

create or replace function is_instructor_of_cohort_course(target_cohort_course_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from cohort_instructors
    where cohort_course_id = target_cohort_course_id and instructor_id = auth.uid()
  );
$$;

create or replace function is_enrolled_in_course(target_course_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from enrollments e
    join cohort_courses cc on cc.id = e.cohort_course_id
    where cc.course_id = target_course_id
      and e.student_id = auth.uid()
      and e.status in ('active', 'completed')
  );
$$;

-- Broad check: does the student have any enrollment in any course under
-- this cohort? Used only for whether they can see the cohort row itself.
create or replace function is_enrolled_in_cohort(target_cohort_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from enrollments e
    join cohort_courses cc on cc.id = e.cohort_course_id
    where cc.cohort_id = target_cohort_id
      and e.student_id = auth.uid()
      and e.status in ('active', 'completed')
  );
$$;

-- Fine-grained check: enrolled in this specific course-within-cohort.
create or replace function is_enrolled_in_cohort_course(target_cohort_course_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from enrollments
    where cohort_course_id = target_cohort_course_id
      and student_id = auth.uid()
      and status in ('active', 'completed')
  );
$$;

drop function if exists is_instructor_of_cohort(uuid);

-- ---------- RLS: cohort_courses ----------

alter table cohort_courses enable row level security;

drop policy if exists "cohort_courses_admin_all" on cohort_courses;
create policy "cohort_courses_admin_all" on cohort_courses for all
  using (is_admin()) with check (is_admin());

drop policy if exists "cohort_courses_instructor_read" on cohort_courses;
create policy "cohort_courses_instructor_read" on cohort_courses for select
  using (is_instructor_of_cohort_course(id));

drop policy if exists "cohort_courses_student_read" on cohort_courses;
create policy "cohort_courses_student_read" on cohort_courses for select
  using (is_enrolled_in_cohort_course(id));

-- ---------- RLS: cohorts (course-less container) ----------

drop policy if exists "cohorts_admin_all" on cohorts;
create policy "cohorts_admin_all" on cohorts for all
  using (is_admin()) with check (is_admin());

drop policy if exists "cohorts_instructor_read" on cohorts;
create policy "cohorts_instructor_read" on cohorts for select
  using (exists (
    select 1 from cohort_courses cc
    where cc.cohort_id = cohorts.id and is_instructor_of_cohort_course(cc.id)
  ));

drop policy if exists "cohorts_student_read" on cohorts;
create policy "cohorts_student_read" on cohorts for select
  using (is_enrolled_in_cohort(id));

-- ---------- RLS: cohort_instructors ----------

drop policy if exists "cohort_instructors_admin_all" on cohort_instructors;
create policy "cohort_instructors_admin_all" on cohort_instructors for all
  using (is_admin()) with check (is_admin());

drop policy if exists "cohort_instructors_self_read" on cohort_instructors;
create policy "cohort_instructors_self_read" on cohort_instructors for select
  using (instructor_id = auth.uid());

-- ---------- RLS: enrollments ----------

drop policy if exists "enrollments_admin_all" on enrollments;
create policy "enrollments_admin_all" on enrollments for all
  using (is_admin()) with check (is_admin());

drop policy if exists "enrollments_student_read_own" on enrollments;
create policy "enrollments_student_read_own" on enrollments for select
  using (student_id = auth.uid());

drop policy if exists "enrollments_instructor_read" on enrollments;
create policy "enrollments_instructor_read" on enrollments for select
  using (is_instructor_of_cohort_course(cohort_course_id));

-- ---------- RLS: live_sessions ----------

drop policy if exists "live_sessions_admin_all" on live_sessions;
create policy "live_sessions_admin_all" on live_sessions for all
  using (is_admin()) with check (is_admin());

drop policy if exists "live_sessions_instructor_all" on live_sessions;
create policy "live_sessions_instructor_all" on live_sessions for all
  using (is_instructor_of_cohort_course(cohort_course_id)) with check (is_instructor_of_cohort_course(cohort_course_id));

drop policy if exists "live_sessions_student_read" on live_sessions;
create policy "live_sessions_student_read" on live_sessions for select
  using (is_enrolled_in_cohort_course(cohort_course_id));

-- ---------- RLS: announcements ----------

drop policy if exists "announcements_admin_all" on announcements;
create policy "announcements_admin_all" on announcements for all
  using (is_admin()) with check (is_admin());

drop policy if exists "announcements_instructor_all" on announcements;
create policy "announcements_instructor_all" on announcements for all
  using (is_instructor_of_cohort_course(cohort_course_id)) with check (is_instructor_of_cohort_course(cohort_course_id));

drop policy if exists "announcements_student_read" on announcements;
create policy "announcements_student_read" on announcements for select
  using (is_enrolled_in_cohort_course(cohort_course_id));

-- ---------- RLS: applications (public insert unaffected) ----------
-- "applications_admin_all" already covers select/update/delete with is_admin(); no column-specific policy to change.

-- ========================================================================
-- Views and functions that joined through the old cohorts.course_id
-- ========================================================================

create view course_progress as
select
  e.student_id,
  co.id as course_id,
  co.title as course_title,
  co.duration_weeks,
  count(l.id) filter (where l.is_required) as total_required_lessons,
  count(lp.lesson_id) filter (where l.is_required) as completed_required_lessons,
  count(distinct w.id) filter (where l.is_required) as non_empty_weeks,
  case
    when count(l.id) filter (where l.is_required) = 0 or co.duration_weeks = 0 then 0
    else round(
      100.0
      * count(lp.lesson_id) filter (where l.is_required)
      * count(distinct w.id) filter (where l.is_required)
      / (count(l.id) filter (where l.is_required) * co.duration_weeks)
    )
  end as percent_complete
from enrollments e
join cohort_courses cc on cc.id = e.cohort_course_id
join courses co on co.id = cc.course_id
join weeks w on w.course_id = co.id
join modules m on m.week_id = w.id
join lessons l on l.module_id = m.id
left join lesson_progress lp on lp.lesson_id = l.id and lp.student_id = e.student_id
where e.status in ('active', 'completed')
group by e.student_id, co.id, co.title, co.duration_weeks;

alter view course_progress set (security_invoker = on);

create view week_progress as
select
  e.student_id,
  w.id as week_id,
  w.course_id,
  w.week_number,
  count(m.id) filter (where m.is_required) as total_required_modules,
  count(mp.module_id) filter (where mp.status = 'complete') as completed_modules,
  case when count(m.id) filter (where m.is_required) = 0 then false
    else count(mp.module_id) filter (where mp.status = 'complete') = count(m.id) filter (where m.is_required)
  end as is_complete
from enrollments e
join cohort_courses cc on cc.id = e.cohort_course_id
join weeks w on w.course_id = cc.course_id
join modules m on m.week_id = w.id
left join module_progress mp on mp.module_id = m.id and mp.student_id = e.student_id
where e.status in ('active', 'completed')
group by e.student_id, w.id, w.course_id, w.week_number;

alter view week_progress set (security_invoker = on);

create or replace function has_unread_announcements()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from announcements a
    join enrollments e on e.cohort_course_id = a.cohort_course_id
    where e.student_id = auth.uid()
      and e.status in ('active', 'completed')
      and not exists (
        select 1 from announcement_reads r where r.announcement_id = a.id and r.student_id = auth.uid()
      )
  );
$$;

-- ========================================================================
-- Editable course duration: adding weeks is simple (new rows); removing
-- weeks is handled in application code, which blocks removing a week that
-- already has modules in it rather than silently destroying content.
-- Nothing schema-side is required beyond courses.duration_weeks already
-- being a plain, already-editable column.
-- ========================================================================
