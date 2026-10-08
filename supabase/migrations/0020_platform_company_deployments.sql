alter table platform_companies
  add column if not exists vercel_project_id text,
  add column if not exists vercel_deployment_id text,
  add column if not exists vercel_deployment_url text;
