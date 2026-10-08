-- White-label foundation for schools, academies, and partner platforms.
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  primary_color text not null default '#e8a33d',
  custom_domain text unique,
  created_at timestamptz not null default now()
);

create table if not exists organization_members (
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role user_role not null default 'student',
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

alter table profiles add column if not exists default_organization_id uuid references organizations(id) on delete set null;

alter table organizations enable row level security;
alter table organization_members enable row level security;

create policy "members can view their organizations" on organizations
  for select using (exists (select 1 from organization_members m where m.organization_id = organizations.id and m.user_id = auth.uid()));

create policy "public can view organization branding" on organizations
  for select using (true);

create policy "members can view organization members" on organization_members
  for select using (user_id = auth.uid() or exists (select 1 from organization_members m where m.organization_id = organization_members.organization_id and m.user_id = auth.uid() and m.role in ('admin')));

create policy "global admins can create organizations" on organizations
  for insert with check (auth_role() = 'admin');
create policy "organization admins can update organizations" on organizations
  for update using (exists (select 1 from organization_members m where m.organization_id = organizations.id and m.user_id = auth.uid() and m.role = 'admin'))
  with check (exists (select 1 from organization_members m where m.organization_id = organizations.id and m.user_id = auth.uid() and m.role = 'admin'));

create index if not exists organization_members_user_idx on organization_members(user_id);
create index if not exists organizations_slug_idx on organizations(slug);
