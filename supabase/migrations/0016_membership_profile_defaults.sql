-- Compatibility defaults only. Authorization remains organization_members.role.
-- A user can belong to multiple organizations; these profile fields represent
-- the initial/default workspace, not the user's complete organization set.
create or replace function set_first_membership_defaults()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update profiles
  set default_organization_id = coalesce(default_organization_id, new.organization_id),
      organization_id = coalesce(organization_id, new.organization_id)
  where id = new.user_id;
  return new;
end;
$$;

drop trigger if exists membership_profile_defaults on organization_members;
create trigger membership_profile_defaults
after insert on organization_members
for each row execute function set_first_membership_defaults();

-- Repair existing memberships whose users have no initial workspace values.
update profiles p
set default_organization_id = first_membership.organization_id,
    organization_id = coalesce(p.organization_id, first_membership.organization_id)
from (
  select distinct on (user_id) user_id, organization_id
  from organization_members
  order by user_id, created_at
) as first_membership
where p.id = first_membership.user_id
  and p.default_organization_id is null;
