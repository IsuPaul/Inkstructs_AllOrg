# Organization-aware authorization

`organization_members` is the source of truth for an organization role. The profile fields are only compatibility/default-workspace fields.

Organization-specific login uses this flow:

```text
/embed/example-academy
  → /login?next=/org/example-academy/enter
  → /org/example-academy/enter
  → set active_organization_id cookie
  → redirect using organization_members.role
  → /dashboard, /teach, or /admin
```

One person has one Supabase Auth account and one password. Organization memberships provide the active organization context and role; separate passwords per organization are not necessary.
