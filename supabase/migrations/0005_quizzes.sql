-- Weekly multiple-choice quizzes.
--
-- Design note: quiz_options.is_correct must never reach a student's browser
-- before they submit. Raw table RLS is row-level, not column-level, so a
-- normal "students can read" policy would leak the correct answer in the
-- network response. Instead, students never get a SELECT policy on
-- quiz_questions/quiz_options at all — they go through two SECURITY DEFINER
-- functions that manually shape what's returned (get_quiz_for_student) and
-- do the grading server-side (submit_quiz_attempt).

create table quizzes (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references weeks(id) on delete cascade unique, -- one quiz per week
  title text not null,
  instructions text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references quizzes(id) on delete cascade,
  prompt text not null,
  position int not null default 0
);

create table quiz_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references quiz_questions(id) on delete cascade,
  text text not null,
  is_correct boolean not null default false,
  position int not null default 0
);

create table quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references quizzes(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  score int not null,
  total int not null,
  submitted_at timestamptz not null default now(),
  unique (quiz_id, student_id) -- resubmitting overwrites the previous attempt
);

create table quiz_responses (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references quiz_attempts(id) on delete cascade,
  question_id uuid not null references quiz_questions(id) on delete cascade,
  selected_option_id uuid references quiz_options(id)
);

create index idx_quiz_questions_quiz on quiz_questions(quiz_id);
create index idx_quiz_options_question on quiz_options(question_id);
create index idx_quiz_attempts_quiz on quiz_attempts(quiz_id);
create index idx_quiz_attempts_student on quiz_attempts(student_id);
create index idx_quiz_responses_attempt on quiz_responses(attempt_id);

alter table quizzes enable row level security;
alter table quiz_questions enable row level security;
alter table quiz_options enable row level security;
alter table quiz_attempts enable row level security;
alter table quiz_responses enable row level security;

-- Admin/instructor manage quizzes for their own courses directly through the table.
drop policy if exists "quizzes_admin_all" on quizzes;
create policy "quizzes_admin_all" on quizzes for all
  using (is_admin()) with check (is_admin());
drop policy if exists "quizzes_instructor_all" on quizzes;
create policy "quizzes_instructor_all" on quizzes for all
  using (is_instructor_of_course((select course_id from weeks where weeks.id = week_id)))
  with check (is_instructor_of_course((select course_id from weeks where weeks.id = week_id)));
-- Students only see that a quiz exists (title) via this table; questions/options
-- are fetched through get_quiz_for_student(), never directly.
drop policy if exists "quizzes_student_read" on quizzes;
create policy "quizzes_student_read" on quizzes for select
  using (is_enrolled_in_course((select course_id from weeks where weeks.id = week_id)));

drop policy if exists "quiz_questions_admin_all" on quiz_questions;
create policy "quiz_questions_admin_all" on quiz_questions for all
  using (is_admin()) with check (is_admin());
drop policy if exists "quiz_questions_instructor_all" on quiz_questions;
create policy "quiz_questions_instructor_all" on quiz_questions for all
  using (is_instructor_of_course((select w.course_id from quizzes q join weeks w on w.id = q.week_id where q.id = quiz_id)))
  with check (is_instructor_of_course((select w.course_id from quizzes q join weeks w on w.id = q.week_id where q.id = quiz_id)));
-- deliberately no student select policy here

drop policy if exists "quiz_options_admin_all" on quiz_options;
create policy "quiz_options_admin_all" on quiz_options for all
  using (is_admin()) with check (is_admin());
drop policy if exists "quiz_options_instructor_all" on quiz_options;
create policy "quiz_options_instructor_all" on quiz_options for all
  using (is_instructor_of_course((select w.course_id from quiz_questions qq join quizzes q on q.id = qq.quiz_id join weeks w on w.id = q.week_id where qq.id = question_id)))
  with check (is_instructor_of_course((select w.course_id from quiz_questions qq join quizzes q on q.id = qq.quiz_id join weeks w on w.id = q.week_id where qq.id = question_id)));
-- deliberately no student select policy here

drop policy if exists "quiz_attempts_admin_all" on quiz_attempts;
create policy "quiz_attempts_admin_all" on quiz_attempts for all
  using (is_admin()) with check (is_admin());
drop policy if exists "quiz_attempts_instructor_read" on quiz_attempts;
create policy "quiz_attempts_instructor_read" on quiz_attempts for select
  using (is_instructor_of_course((select w.course_id from quizzes q join weeks w on w.id = q.week_id where q.id = quiz_id)));
drop policy if exists "quiz_attempts_student_read_own" on quiz_attempts;
create policy "quiz_attempts_student_read_own" on quiz_attempts for select
  using (student_id = auth.uid());
-- writes to quiz_attempts happen only via submit_quiz_attempt() below

drop policy if exists "quiz_responses_admin_all" on quiz_responses;
create policy "quiz_responses_admin_all" on quiz_responses for all
  using (is_admin()) with check (is_admin());
drop policy if exists "quiz_responses_instructor_read" on quiz_responses;
create policy "quiz_responses_instructor_read" on quiz_responses for select
  using (is_instructor_of_course((select w.course_id from quiz_attempts a join quizzes q on q.id = a.quiz_id join weeks w on w.id = q.week_id where a.id = attempt_id)));
drop policy if exists "quiz_responses_student_read_own" on quiz_responses;
create policy "quiz_responses_student_read_own" on quiz_responses for select
  using (exists (select 1 from quiz_attempts a where a.id = attempt_id and a.student_id = auth.uid()));

-- ---------- Student-safe read: questions and options, WITHOUT is_correct ----------

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

-- ---------- Grading: server-side only, never exposes correct answers ----------

create or replace function submit_quiz_attempt(p_quiz_id uuid, p_answers jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_course_id uuid;
  v_student_id uuid := auth.uid();
  v_attempt_id uuid;
  v_total int;
  v_score int := 0;
  v_answer jsonb;
  v_is_correct boolean;
begin
  select w.course_id into v_course_id
    from quizzes q join weeks w on w.id = q.week_id
    where q.id = p_quiz_id;

  if v_course_id is null or not is_enrolled_in_course(v_course_id) then
    raise exception 'Not authorized';
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

-- ---------- Instructor/admin write: full replace of a quiz's questions ----------

create or replace function create_or_update_quiz(
  p_week_id uuid,
  p_title text,
  p_instructions text,
  p_questions jsonb -- [{ prompt, options: [{ text, is_correct }] }]
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

  insert into quizzes (week_id, title, instructions, created_by)
  values (p_week_id, p_title, p_instructions, auth.uid())
  on conflict (week_id) do update set title = excluded.title, instructions = excluded.instructions, updated_at = now()
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
