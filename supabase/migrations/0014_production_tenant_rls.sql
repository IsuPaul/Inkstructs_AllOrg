-- Production tenant isolation. Run after 0013.
-- Every tenant-owned record carries its organization_id so RLS can enforce a
-- single, consistent boundary across the dashboard.
alter table profiles add column if not exists organization_id uuid references organizations(id) on delete set null;
alter table weeks add column if not exists organization_id uuid references organizations(id) on delete cascade;
alter table modules add column if not exists organization_id uuid references organizations(id) on delete cascade;
alter table lessons add column if not exists organization_id uuid references organizations(id) on delete cascade;
alter table assets add column if not exists organization_id uuid references organizations(id) on delete cascade;
alter table cohort_instructors add column if not exists organization_id uuid references organizations(id) on delete cascade;
alter table enrollments add column if not exists organization_id uuid references organizations(id) on delete cascade;
alter table live_sessions add column if not exists organization_id uuid references organizations(id) on delete cascade;
alter table lesson_progress add column if not exists organization_id uuid references organizations(id) on delete cascade;
alter table module_progress add column if not exists organization_id uuid references organizations(id) on delete cascade;
alter table submissions add column if not exists organization_id uuid references organizations(id) on delete cascade;
alter table payments add column if not exists organization_id uuid references organizations(id) on delete cascade;
alter table coupons add column if not exists organization_id uuid references organizations(id) on delete cascade;
alter table certificates add column if not exists organization_id uuid references organizations(id) on delete cascade;
alter table announcements add column if not exists organization_id uuid references organizations(id) on delete cascade;
alter table quizzes add column if not exists organization_id uuid references organizations(id) on delete cascade;
alter table quiz_questions add column if not exists organization_id uuid references organizations(id) on delete cascade;
alter table quiz_options add column if not exists organization_id uuid references organizations(id) on delete cascade;
alter table quiz_attempts add column if not exists organization_id uuid references organizations(id) on delete cascade;
alter table quiz_responses add column if not exists organization_id uuid references organizations(id) on delete cascade;
alter table cohort_courses add column if not exists organization_id uuid references organizations(id) on delete cascade;

do $$ declare t text; begin
  foreach t in array array['profiles','courses','cohorts','applications','weeks','modules','lessons','assets','cohort_instructors','enrollments','live_sessions','lesson_progress','module_progress','submissions','payments','coupons','certificates','announcements','quizzes','quiz_questions','quiz_options','quiz_attempts','quiz_responses','cohort_courses'] loop
    execute format('update %I set organization_id = (select id from organizations where slug = ''inkstructs'') where organization_id is null', t);
    execute format('create index if not exists %I on %I(organization_id)', t || '_organization_idx', t);
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

update profiles set default_organization_id = (select id from organizations where slug = 'inkstructs') where default_organization_id is null;
insert into organization_members (organization_id, user_id, role)
select (select id from organizations where slug = 'inkstructs'), id, role
from profiles
on conflict (organization_id, user_id) do nothing;

create or replace function tenant_member(target_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from organization_members where organization_id = target_org and user_id = auth.uid());
$$;

create or replace function tenant_admin(target_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from organization_members where organization_id = target_org and user_id = auth.uid() and role = 'admin');
$$;

create or replace function assign_default_tenant()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.organization_id is null then
    select coalesce(default_organization_id, (select id from organizations where slug = 'inkstructs'))
      into new.organization_id from profiles where id = auth.uid();
  end if;
  return new;
end;
$$;

do $$ declare t text; begin
  foreach t in array array['courses','cohorts','applications','weeks','modules','lessons','assets','cohort_instructors','enrollments','live_sessions','lesson_progress','module_progress','submissions','payments','coupons','certificates','announcements','quizzes','quiz_questions','quiz_options','quiz_attempts','quiz_responses','cohort_courses'] loop
    execute format('drop trigger if exists assign_default_tenant on %I', t);
    execute format('create trigger assign_default_tenant before insert on %I for each row execute function assign_default_tenant()', t);
  end loop;
end $$;

-- Replace the old global policies. Policies are OR-ed by PostgreSQL, so old
-- policies must be removed before tenant policies can be authoritative.
do $$ declare p record; begin
  for p in select policyname, tablename from pg_policies where schemaname = 'public' and tablename in ('profiles','courses','cohorts','applications','weeks','modules','lessons','assets','cohort_instructors','enrollments','live_sessions','lesson_progress','module_progress','submissions','payments','coupons','certificates','announcements','quizzes','quiz_questions','quiz_options','quiz_attempts','quiz_responses','cohort_courses') loop
    execute format('drop policy if exists %I on %I', p.policyname, p.tablename);
  end loop;
end $$;

do $$ declare t text; begin
  foreach t in array array['profiles','courses','cohorts','applications','weeks','modules','lessons','assets','cohort_instructors','enrollments','live_sessions','lesson_progress','module_progress','submissions','payments','coupons','certificates','announcements','quizzes','quiz_questions','quiz_options','quiz_attempts','quiz_responses','cohort_courses'] loop
    execute format('create policy tenant_read_%I on %I for select using (tenant_member(organization_id))', t, t);
    execute format('create policy tenant_admin_%I on %I for all using (tenant_admin(organization_id)) with check (tenant_admin(organization_id))', t, t);
  end loop;
end $$;

-- Public course catalogue and public admissions remain available.
create policy tenant_public_course_catalogue on courses for select using (is_published = true);
create policy tenant_public_application_insert on applications for insert with check (true);

-- Learners can write only their own progress/submissions and read their own
-- enrollment-related records within their organization.
create policy tenant_student_progress on lesson_progress for all using (student_id = auth.uid() and tenant_member(organization_id)) with check (student_id = auth.uid() and tenant_member(organization_id));
create policy tenant_student_submission on submissions for insert with check (student_id = auth.uid() and tenant_member(organization_id));
create policy tenant_student_enrollment on enrollments for select using (student_id = auth.uid() and tenant_member(organization_id));
