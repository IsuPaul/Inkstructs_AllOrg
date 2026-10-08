# Phase 2 fixes and testing

## Apply migrations

Run the migrations in Supabase SQL Editor in this order:

```text
0001_schema.sql
0002_rls.sql
0003_functions.sql
0004_profile_fields.sql
0005_quizzes.sql
0006_course_materials_storage.sql
0007_submissions_storage.sql
0008_updates.sql
0009_updates.sql
0010_updates.sql
0011_cohort_courses.sql
0012_organizations.sql
0013_tenant_content_links.sql
0014_production_tenant_rls.sql
0015_organization_creator_membership.sql
```

If the first eleven migrations are already applied, run only `0012` through `0015`.

## Configure local environment

```bash
cp .env.local.example .env.local
npm install
npm run dev
```

Set the Supabase URL, anon key, service-role key, and site URL in `.env.local`.

## Test organization creation

1. Sign in as a global administrator.
2. Open `/admin/organizations`.
3. Create an organization.
4. Open the organization detail page.
5. Confirm the creator appears as `admin` under Members.

## Test a new-member invite

1. Invite an unused email as Student, Instructor, or Administrator.
2. Confirm the invite succeeds without a `formData.get` error.
3. Confirm the new user appears under Members.
4. Accept the invitation in a separate browser/incognito session.
5. Confirm the profile exists and the user can sign in.

## Test an existing user

1. Use an email that already has a profile.
2. Add that user to a second organization with a different membership role.
3. Confirm the membership row is created or updated without changing the user’s global profile record.
4. Verify the organization membership role is stored as the lowercase enum value: `admin`, `instructor`, or `student`.

## Important production check

The current Phase 2 dashboard still uses `profiles.role` for route selection. Organization-specific role switching must be completed before allowing one account to operate with different roles in different organizations. The secure target model is to resolve `organization_members.role` after selecting the active organization, then use that role for dashboard navigation and authorization.
