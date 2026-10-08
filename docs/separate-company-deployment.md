# Separate company deployment model

Each customer receives an independent deployment of this project and an independent Supabase project. Do not run the organization migrations (`0012` and later) for a new single-company deployment.

## New company checklist

1. Create a new Supabase project owned or paid for by the customer.
2. Run migrations `0001_schema.sql` through `0011_cohort_courses.sql` only.
3. Configure the customer deployment environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://customer-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=customer-anon-key
SUPABASE_SERVICE_ROLE_KEY=customer-service-role-key
NEXT_PUBLIC_SITE_URL=https://learn.customer-domain.com
NEXT_PUBLIC_DEPLOYMENT_NAME=Customer Academy
NEXT_PUBLIC_DEPLOYMENT_LOGO_URL=https://customer-domain.com/logo.png
NEXT_PUBLIC_DEPLOYMENT_PRIMARY_COLOR=#2f7d6b
NEXT_PUBLIC_DEPLOYMENT_DASHBOARD_URL=https://learn.customer-domain.com
```

4. Deploy the same codebase to the customer’s dashboard domain.
5. Run `scripts/seed-admin.ts` or create the first administrator in that customer’s Supabase project.
6. The customer administrator creates courses, cohorts, instructors, students, payments, and certificates inside that isolated project.

## Security model

The Supabase project is the tenant boundary. A customer has no database connection, Auth account, Storage bucket, or RLS visibility into another customer’s project. Users can use the same email address in different deployments and can have different passwords because each Supabase Auth project is independent.

## Important migration rule

For this model, do not apply these migrations to new customer projects:

```text
0012_organizations.sql
0013_tenant_content_links.sql
0014_production_tenant_rls.sql
0015_organization_creator_membership.sql
0016_membership_profile_defaults.sql
0017_fix_recursive_membership_rls.sql
0018_organization_status.sql
```

Those migrations belong to the earlier shared-database experiment. The standard single-company deployment uses the original schema and RLS through `0011`.
