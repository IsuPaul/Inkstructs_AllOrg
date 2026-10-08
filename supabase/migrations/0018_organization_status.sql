alter table organizations add column if not exists is_active boolean not null default true;

create index if not exists organizations_active_idx on organizations(is_active);

-- Prevent inactive organizations from being used by the public branded entry route.
drop policy if exists "public can view organization branding" on organizations;
create policy "public can view active organization branding" on organizations
  for select
  using (is_active = true);
