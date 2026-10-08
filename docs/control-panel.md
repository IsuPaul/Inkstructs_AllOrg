# Inkstructs control panel

The platform control panel is available at:

```text
/admin/platform/companies
```

It stores company provisioning records, creates a separate Supabase project, and can deploy the GitHub template to Vercel from each company card. It uses server-only Supabase and Vercel credentials. It does not yet run customer migrations, create the first customer administrator, or configure custom domains.

Run `0019_platform_companies.sql` and `0020_platform_company_deployments.sql` in the control-panel Supabase project. Do not run these migrations in a customer deployment that only uses migrations through `0011`. Add `SUPABASE_ACCESS_TOKEN`, `SUPABASE_ORGANIZATION_SLUG`, `VERCEL_TOKEN`, `VERCEL_TEAM_ID`, `VERCEL_GIT_REPO=IsuPaul/Inkstructs_AllOrg`, and optionally `VERCEL_GIT_BRANCH=main` to `.env.local`, restart the dev server, then use **Create Supabase project** followed by **Deploy to Vercel**.
