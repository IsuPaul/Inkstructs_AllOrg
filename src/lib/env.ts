function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.local.example to .env.local and fill it in.`
    );
  }
  return value;
}

export const env = {
  supabaseUrl: () => required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: () =>
    required("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  supabaseServiceRoleKey: () =>
    required("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY),
  siteUrl: () => process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  supabaseManagementToken: () => required("SUPABASE_ACCESS_TOKEN", process.env.SUPABASE_ACCESS_TOKEN),
  supabaseOrganizationSlug: () => required("SUPABASE_ORGANIZATION_SLUG", process.env.SUPABASE_ORGANIZATION_SLUG),
  vercelToken: () => required("VERCEL_TOKEN", process.env.VERCEL_TOKEN),
  vercelTeamId: () => process.env.VERCEL_TEAM_ID,
  vercelGitRepo: () => process.env.VERCEL_GIT_REPO ?? "IsuPaul/Inkstructs_AllOrg",
  vercelGitBranch: () => process.env.VERCEL_GIT_BRANCH ?? "main",
};
