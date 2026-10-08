-- Auto-create a profile row when a new auth user is confirmed (invite accepted / signup).
-- role defaults to 'student'; admin/instructor accounts are created via scripts/seed-admin.ts
-- or promoted afterwards by an admin.

create or replace function handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'student')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------- Progress rollup ----------
-- When a lesson is marked complete, check whether every required lesson in its
-- module is now complete for that student; if so, flip module_progress to 'complete'.
-- Course/week percentages are NOT stored — see the views below, computed on read.

create or replace function rollup_module_progress()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_module_id uuid;
  v_student_id uuid;
  v_required_count int;
  v_done_count int;
  v_new_status progress_status;
begin
  select module_id into v_module_id from lessons where id = coalesce(new.lesson_id, old.lesson_id);
  v_student_id := coalesce(new.student_id, old.student_id);

  select count(*) into v_required_count
    from lessons where module_id = v_module_id and is_required = true;

  select count(*) into v_done_count
    from lesson_progress lp
    join lessons l on l.id = lp.lesson_id
    where l.module_id = v_module_id
      and l.is_required = true
      and lp.student_id = v_student_id;

  if v_required_count = 0 then
    v_new_status := 'not_started';
  elsif v_done_count >= v_required_count then
    v_new_status := 'complete';
  elsif v_done_count > 0 then
    v_new_status := 'in_progress';
  else
    v_new_status := 'not_started';
  end if;

  insert into module_progress (student_id, module_id, status, completed_at)
  values (v_student_id, v_module_id, v_new_status, case when v_new_status = 'complete' then now() else null end)
  on conflict (student_id, module_id)
  do update set status = excluded.status, completed_at = excluded.completed_at;

  return null;
end;
$$;

drop trigger if exists on_lesson_progress_change on lesson_progress;
create trigger on_lesson_progress_change
  after insert or delete on lesson_progress
  for each row execute function rollup_module_progress();

-- ---------- Read-only progress views (computed, never stored) ----------

create or replace view course_progress as
select
  e.student_id,
  co.id as course_id,
  co.title as course_title,
  count(distinct m.id) filter (where m.is_required) as total_required_modules,
  count(distinct mp.module_id) filter (where mp.status = 'complete') as completed_modules,
  case when count(distinct m.id) filter (where m.is_required) = 0 then 0
    else round(100.0 * count(distinct mp.module_id) filter (where mp.status = 'complete')
      / count(distinct m.id) filter (where m.is_required))
  end as percent_complete
from enrollments e
join cohorts c on c.id = e.cohort_id
join courses co on co.id = c.course_id
join weeks w on w.course_id = co.id
join modules m on m.week_id = w.id
left join module_progress mp on mp.module_id = m.id and mp.student_id = e.student_id
where e.status in ('active', 'completed')
group by e.student_id, co.id, co.title;

create or replace view week_progress as
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
join cohorts c on c.id = e.cohort_id
join weeks w on w.course_id = c.course_id
join modules m on m.week_id = w.id
left join module_progress mp on mp.module_id = m.id and mp.student_id = e.student_id
where e.status in ('active', 'completed')
group by e.student_id, w.id, w.course_id, w.week_number;

alter view course_progress set (security_invoker = on);
alter view week_progress set (security_invoker = on);
