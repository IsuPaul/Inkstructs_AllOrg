-- ========== Account deactivation ==========

alter table profiles add column if not exists is_active boolean not null default true;

-- ========== "Continue where you left off" tracking ==========
-- One row per (student, course): the most recent module they opened.
-- Deliberately a separate table from module_progress, which the completion
-- trigger already owns — this one is just a lightweight "last visited"
-- pointer, updated every time a student opens a module.

create table if not exists last_viewed_module (
  student_id uuid not null references profiles(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  module_id uuid not null references modules(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (student_id, course_id)
);

create index if not exists idx_last_viewed_module_student on last_viewed_module(student_id);

alter table last_viewed_module enable row level security;

drop policy if exists "last_viewed_module_self" on last_viewed_module;
create policy "last_viewed_module_self" on last_viewed_module for all
  using (student_id = auth.uid()) with check (student_id = auth.uid());

drop policy if exists "last_viewed_module_admin_all" on last_viewed_module;
create policy "last_viewed_module_admin_all" on last_viewed_module for all
  using (is_admin()) with check (is_admin());
