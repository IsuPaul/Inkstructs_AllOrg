-- Connect existing core records to a tenant. Run after 0012.
insert into organizations (name, slug, primary_color)
select 'Inkstructs', 'inkstructs', '#e8a33d'
where not exists (select 1 from organizations where slug = 'inkstructs');

alter table courses add column if not exists organization_id uuid references organizations(id) on delete cascade;
alter table cohorts add column if not exists organization_id uuid references organizations(id) on delete cascade;
alter table applications add column if not exists organization_id uuid references organizations(id) on delete cascade;

update courses set organization_id = (select id from organizations where slug = 'inkstructs') where organization_id is null;
update cohorts set organization_id = (select id from organizations where slug = 'inkstructs') where organization_id is null;
update applications set organization_id = (select id from organizations where slug = 'inkstructs') where organization_id is null;

create index if not exists courses_organization_idx on courses(organization_id);
create index if not exists cohorts_organization_idx on cohorts(organization_id);
create index if not exists applications_organization_idx on applications(organization_id);

create or replace function is_member_of_organization(target_organization_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from organization_members where organization_id = target_organization_id and user_id = auth.uid());
$$;

create or replace function is_admin_of_organization(target_organization_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from organization_members where organization_id = target_organization_id and user_id = auth.uid() and role = 'admin');
$$;
