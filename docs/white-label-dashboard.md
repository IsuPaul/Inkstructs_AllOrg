# White-label dashboard foundation

This project includes the production tenant boundary for schools and partner platforms.

## Database setup

Run `supabase/migrations/0012_organizations.sql` after the existing migrations. It creates:

- `organizations` — tenant name, slug, logo, color, and future custom domain
- `organization_members` — users and roles inside each tenant
- `profiles.default_organization_id` — the user’s default tenant
- `organization_id` on tenant-owned dashboard records
- RLS policies that require organization membership

Create an organization and membership from the Supabase dashboard or an admin-only server action:

```sql
insert into organizations (name, slug, primary_color)
values ('Example Academy', 'example-academy', '#2f7d6b');

insert into organization_members (organization_id, user_id, role)
select o.id, p.id, 'admin'
from organizations o, profiles p
where o.slug = 'example-academy' and p.email = 'admin@example.com';
```

## Embed-ready route

The branded entry route is:

```text
/embed/example-academy
```

A partner can link to it or place it behind a branded page. The route reads the organization’s logo, name, and accent color, then sends learners into the authenticated dashboard.

The branded entry route keeps authentication on the main dashboard. Apply migrations through `0014_production_tenant_rls.sql` in order. New dashboard records inherit the signed-in user’s default organization. Before opening a new tenant to real users, create its organization membership and test with two separate accounts.

For a production embed, use a reverse proxy or iframe with an allowlist of partner origins. Do not expose the Supabase service-role key to a partner browser. SSO and API provisioning can be added on top of the organization membership boundary.
