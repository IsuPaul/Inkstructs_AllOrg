-- ========== Quiz retake toggle ==========

alter table quizzes add column if not exists allow_retake boolean not null default true;

-- The signature below adds a parameter (p_allow_retake) that didn't exist
-- in the original (0005_quizzes.sql). Postgres identifies a function by
-- name + parameter types, so a changed signature doesn't "replace" the old
-- one — it silently creates a second, dead overload alongside it. Drop the
-- old 4-parameter version explicitly so only one version ever exists.
drop function if exists create_or_update_quiz(uuid, text, text, jsonb);

create or replace function create_or_update_quiz(
  p_week_id uuid,
  p_title text,
  p_instructions text,
  p_questions jsonb, -- [{ prompt, options: [{ text, is_correct }] }]
  p_allow_retake boolean default true
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_course_id uuid;
  v_quiz_id uuid;
  v_question jsonb;
  v_option jsonb;
  v_question_id uuid;
  v_qpos int := 0;
  v_opos int;
begin
  select course_id into v_course_id from weeks where id = p_week_id;

  if v_course_id is null or not (is_admin() or is_instructor_of_course(v_course_id)) then
    raise exception 'Not authorized';
  end if;

  insert into quizzes (week_id, title, instructions, allow_retake, created_by)
  values (p_week_id, p_title, p_instructions, p_allow_retake, auth.uid())
  on conflict (week_id) do update set
    title = excluded.title,
    instructions = excluded.instructions,
    allow_retake = excluded.allow_retake,
    updated_at = now()
  returning id into v_quiz_id;

  delete from quiz_questions where quiz_id = v_quiz_id;

  for v_question in select * from jsonb_array_elements(p_questions)
  loop
    insert into quiz_questions (quiz_id, prompt, position)
    values (v_quiz_id, v_question->>'prompt', v_qpos)
    returning id into v_question_id;

    v_opos := 0;
    for v_option in select * from jsonb_array_elements(v_question->'options')
    loop
      insert into quiz_options (question_id, text, is_correct, position)
      values (v_question_id, v_option->>'text', (v_option->>'is_correct')::boolean, v_opos);
      v_opos := v_opos + 1;
    end loop;

    v_qpos := v_qpos + 1;
  end loop;

  return v_quiz_id;
end;
$$;

create or replace function get_quiz_for_student(p_quiz_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_course_id uuid;
  v_result jsonb;
begin
  select w.course_id into v_course_id
    from quizzes q join weeks w on w.id = q.week_id
    where q.id = p_quiz_id;

  if v_course_id is null or not is_enrolled_in_course(v_course_id) then
    raise exception 'Not authorized';
  end if;

  select jsonb_build_object(
    'quiz_id', q.id,
    'title', q.title,
    'instructions', q.instructions,
    'allow_retake', q.allow_retake,
    'questions', coalesce(jsonb_agg(
      jsonb_build_object(
        'id', qq.id,
        'prompt', qq.prompt,
        'position', qq.position,
        'options', (
          select coalesce(jsonb_agg(jsonb_build_object('id', o.id, 'text', o.text, 'position', o.position) order by o.position), '[]'::jsonb)
          from quiz_options o where o.question_id = qq.id
        )
      ) order by qq.position
    ) filter (where qq.id is not null), '[]'::jsonb)
  ) into v_result
  from quizzes q
  left join quiz_questions qq on qq.quiz_id = q.id
  where q.id = p_quiz_id
  group by q.id;

  return v_result;
end;
$$;

create or replace function submit_quiz_attempt(p_quiz_id uuid, p_answers jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_course_id uuid;
  v_allow_retake boolean;
  v_student_id uuid := auth.uid();
  v_attempt_id uuid;
  v_total int;
  v_score int := 0;
  v_answer jsonb;
  v_is_correct boolean;
  v_existing_attempt uuid;
begin
  select w.course_id, q.allow_retake into v_course_id, v_allow_retake
    from quizzes q join weeks w on w.id = q.week_id
    where q.id = p_quiz_id;

  if v_course_id is null or not is_enrolled_in_course(v_course_id) then
    raise exception 'Not authorized';
  end if;

  select id into v_existing_attempt from quiz_attempts where quiz_id = p_quiz_id and student_id = v_student_id;

  if v_existing_attempt is not null and not v_allow_retake then
    raise exception 'Retakes are not allowed for this quiz';
  end if;

  select count(*) into v_total from quiz_questions where quiz_id = p_quiz_id;

  insert into quiz_attempts (quiz_id, student_id, score, total)
  values (p_quiz_id, v_student_id, 0, v_total)
  on conflict (quiz_id, student_id) do update set score = 0, total = v_total, submitted_at = now()
  returning id into v_attempt_id;

  delete from quiz_responses where attempt_id = v_attempt_id;

  for v_answer in select * from jsonb_array_elements(p_answers)
  loop
    select o.is_correct into v_is_correct
      from quiz_options o
      where o.id = (v_answer->>'selected_option_id')::uuid
        and o.question_id = (v_answer->>'question_id')::uuid;

    if v_is_correct then
      v_score := v_score + 1;
    end if;

    insert into quiz_responses (attempt_id, question_id, selected_option_id)
    values (v_attempt_id, (v_answer->>'question_id')::uuid, (v_answer->>'selected_option_id')::uuid);
  end loop;

  update quiz_attempts set score = v_score where id = v_attempt_id;

  return jsonb_build_object('score', v_score, 'total', v_total);
end;
$$;

-- ========== Assignment submissions: link support + one trial only ==========

alter table submissions add column if not exists link_url text;

-- Keep only the newest submission per student/lesson before enforcing uniqueness,
-- in case earlier testing created more than one for the same lesson.
delete from submissions a using submissions b
where a.student_id = b.student_id
  and a.lesson_id = b.lesson_id
  and a.created_at < b.created_at;

do $$ begin
  alter table submissions add constraint submissions_student_lesson_unique unique (student_id, lesson_id);
exception when duplicate_object then null;
end $$;

-- ========== Announcement read tracking (for the unread indicator) ==========

create table if not exists announcement_reads (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  announcement_id uuid not null references announcements(id) on delete cascade,
  read_at timestamptz not null default now(),
  unique (student_id, announcement_id)
);

create index if not exists idx_announcement_reads_student on announcement_reads(student_id);

alter table announcement_reads enable row level security;

drop policy if exists "announcement_reads_self" on announcement_reads;
create policy "announcement_reads_self" on announcement_reads for all
  using (student_id = auth.uid()) with check (student_id = auth.uid());

drop policy if exists "announcement_reads_admin_all" on announcement_reads;
create policy "announcement_reads_admin_all" on announcement_reads for all
  using (is_admin()) with check (is_admin());

-- Single round trip for the sidebar's unread-announcement red dot, instead
-- of the layout running several queries on every single page load.
create or replace function has_unread_announcements()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from announcements a
    join enrollments e on e.cohort_id = a.cohort_id
    where e.student_id = auth.uid()
      and e.status in ('active', 'completed')
      and not exists (
        select 1 from announcement_reads r where r.announcement_id = a.id and r.student_id = auth.uid()
      )
  );
$$;
