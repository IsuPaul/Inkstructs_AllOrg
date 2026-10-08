create type platform_company_status as enum ('draft', 'queued', 'provisioning', 'ready', 'failed', 'suspended');

create table if not exists platform_companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  admin_email text not null,
  dashboard_domain text,
  supabase_project_ref text,
  deployment_url text,
  subscription_plan text,
  status platform_company_status not null default 'draft',
  provisioning_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table platform_companies enable row level security;
create policy "platform admins manage companies" on platform_companies
  for all using (auth_role() = 'admin') with check (auth_role() = 'admin');
