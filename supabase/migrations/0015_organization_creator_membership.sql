-- Make organization creation self-contained: the authenticated creator is
-- automatically added as an organization administrator.
create or replace function add_organization_creator_as_admin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then
    insert into organization_members (organization_id, user_id, role)
    values (new.id, auth.uid(), 'admin')
    on conflict (organization_id, user_id) do update set role = 'admin';
  end if;
  return new;
end;
$$;

drop trigger if exists organization_creator_membership on organizations;
create trigger organization_creator_membership
after insert on organizations
for each row execute function add_organization_creator_as_admin();

-- Repair the default tenant for existing global administrators.
insert into organization_members (organization_id, user_id, role)
select o.id, p.id, 'admin'
from organizations o cross join profiles p
where o.slug = 'inkstructs' and p.role = 'admin'
on conflict (organization_id, user_id) do update set role = 'admin';
