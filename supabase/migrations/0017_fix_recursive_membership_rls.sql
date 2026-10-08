-- Fixes the recursive organization_members policy from 0012.
-- Never query organization_members directly from its own RLS policy.
create or replace function is_organization_admin(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from organization_members
    where organization_id = target_organization_id
      and user_id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function is_organization_member(target_organization_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from organization_members
    where organization_id = target_organization_id
      and user_id = target_user_id
  );
$$;

drop policy if exists "members can view organization members" on organization_members;
create policy "members can view organization members" on organization_members
  for select
  using (
    user_id = auth.uid()
    or is_organization_admin(organization_id)
  );

drop policy if exists "members can view their organizations" on organizations;
create policy "members can view their organizations" on organizations
  for select
  using (is_organization_member(id));

-- Keep organization branding publicly readable for the embed entry screen.
drop policy if exists "public can view organization branding" on organizations;
create policy "public can view organization branding" on organizations
  for select
  using (true);
