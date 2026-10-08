-- ========== 1. Course progress as a function of lessons AND weeks ==========
--
-- percent = (completed required lessons × weeks that actually have content)
--           ------------------------------------------------------------------
--           (total required lessons × the course's full configured duration)
--
-- The weeks factor is what stops an unbuilt course from reading as "almost
-- done" just because the one week that exists is finished — it scales the
-- number down by how much of the course has actually been built so far.
-- When every week has content, non-empty weeks = duration_weeks and the
-- two cancel out, leaving a plain completed/total lesson ratio.
--
-- Note: this changes the view's column list from its original definition
-- (0003_functions.sql), not just the query logic. Postgres only allows
-- CREATE OR REPLACE VIEW to *add* columns at the end — renaming, reordering,
-- retyping, or removing any existing column errors out. So this drops the
-- view first rather than replacing it in place.

drop view if exists course_progress;

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
join cohorts c on c.id = e.cohort_id
join courses co on co.id = c.course_id
join weeks w on w.course_id = co.id
join modules m on m.week_id = w.id
join lessons l on l.module_id = m.id
left join lesson_progress lp on lp.lesson_id = l.id and lp.student_id = e.student_id
where e.status in ('active', 'completed')
group by e.student_id, co.id, co.title, co.duration_weeks;

alter view course_progress set (security_invoker = on);

-- ========== 2. Module scheduling (available immediately, or at a set time) ==========

alter table modules add column if not exists available_at timestamptz;

-- Students can only read lessons (and their files/video) once the parent
-- module's scheduled time has passed. NULL available_at means "available
-- immediately." Modules themselves stay visible to students regardless —
-- the course page needs to show "unlocks on <date>" rather than just
-- silently omitting the row.

drop policy if exists "lessons_student_read" on lessons;
create policy "lessons_student_read" on lessons for select
  using (
    is_enrolled_in_course((select w.course_id from modules m join weeks w on w.id = m.week_id where m.id = module_id))
    and coalesce((select m.available_at <= now() from modules m where m.id = module_id), true)
  );

drop policy if exists "assets_student_read" on assets;
create policy "assets_student_read" on assets for select
  using (
    is_enrolled_in_course((select w.course_id from lessons l join modules m on m.id = l.module_id join weeks w on w.id = m.week_id where l.id = lesson_id))
    and coalesce((select m.available_at <= now() from lessons l join modules m on m.id = l.module_id where l.id = lesson_id), true)
  );

-- ========== 3. Assignment grading format, instructor's choice ==========
--
-- 'fraction'     -> shown as "score / max_score" (e.g. 8/10)
-- 'whole_number' -> shown as a single number, either as "85%" (percentage)
--                   or bare "85" (unitless), per grading_unit

alter table lessons add column if not exists grading_type text check (grading_type in ('fraction', 'whole_number'));
alter table lessons add column if not exists grading_unit text check (grading_unit in ('percentage', 'unitless'));
alter table lessons add column if not exists max_score numeric;
