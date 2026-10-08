import {
  deployPlatformCompany,
  provisionPlatformCompany,
  updatePlatformCompanyStatus,
} from "@/actions/platform-companies";
import { createAdminClient } from "@/lib/supabase/admin";
import { CompanyForm } from "./company-form";

async function submitProvisionCompany(formData: FormData): Promise<void> {
  "use server";

  await provisionPlatformCompany(formData);
}

async function submitDeployCompany(formData: FormData): Promise<void> {
  "use server";

  await deployPlatformCompany(formData);
}

async function submitCompanyStatus(formData: FormData): Promise<void> {
  "use server";

  await updatePlatformCompanyStatus(formData);
}

export default async function PlatformCompaniesPage() {
  const admin = createAdminClient();

  const { data: companies, error } = await admin
    .from("platform_companies")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="p-6 sm:p-8">
        <div className="mx-auto max-w-6xl">
          <h1 className="font-display text-3xl text-foreground">
            Companies
          </h1>

          <p className="mt-4 text-sm text-danger">
            Could not load companies: {error.message}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="p-6 sm:p-8">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-600">
          Control panel
        </p>

        <h1 className="mt-2 font-display text-3xl text-foreground">
          Companies
        </h1>

        <p className="mt-2 max-w-2xl text-sm text-muted">
          Create and track independent customer dashboard deployments. Each
          company receives its own Supabase project and Vercel deployment.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.5fr]">
          <CompanyForm />

          <div className="space-y-3">
            {companies && companies.length > 0 ? (
              companies.map((company) => (
                <div
                  key={company.id}
                  className="rounded-[var(--radius-md)] border border-border bg-surface p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="font-medium text-foreground">
                        {company.name}
                      </h2>

                      <p className="mt-1 text-xs text-muted">
                        {company.slug} · {company.admin_email}
                      </p>

                      {company.supabase_project_ref && (
                        <p className="mt-1 text-xs text-muted">
                          Supabase project: {company.supabase_project_ref}
                        </p>
                      )}

                      {company.vercel_project_id && (
                        <p className="mt-1 text-xs text-muted">
                          Vercel project: {company.vercel_project_id}
                        </p>
                      )}

                      {company.vercel_deployment_url && (
                        <a
                          className="mt-1 block text-xs text-amber-700 underline"
                          href={company.vercel_deployment_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open deployment
                        </a>
                      )}
                    </div>

                    <span className="rounded-full bg-paper-100 px-2.5 py-1 text-xs capitalize text-muted">
                      {company.status}
                    </span>
                  </div>

                  <p className="mt-4 text-sm text-muted">
                    {company.provisioning_notes || "No provisioning notes."}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <form action={submitProvisionCompany}>
                      <input
                        type="hidden"
                        name="id"
                        value={company.id}
                      />

                      <button
                        type="submit"
                        disabled={
                          Boolean(company.supabase_project_ref) ||
                          company.status === "provisioning"
                        }
                        className="rounded bg-amber-500 px-3 py-2 text-xs font-medium text-ink-950 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Create Supabase project
                      </button>
                    </form>

                    <form action={submitDeployCompany}>
                      <input
                        type="hidden"
                        name="id"
                        value={company.id}
                      />

                      <button
                        type="submit"
                        disabled={
                          !company.supabase_project_ref ||
                          Boolean(company.vercel_project_id)
                        }
                        className="rounded bg-blue-600 px-3 py-2 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Deploy to Vercel
                      </button>
                    </form>

                    <form
                      action={submitCompanyStatus}
                      className="flex min-w-0 flex-1 flex-wrap gap-2"
                    >
                      <input
                        type="hidden"
                        name="id"
                        value={company.id}
                      />

                      <input
                        name="provisioning_notes"
                        defaultValue={company.provisioning_notes || ""}
                        placeholder="Update provisioning notes"
                        className="min-w-0 flex-1 rounded border bg-background px-3 py-2 text-xs"
                      />

                      <select
                        name="status"
                        defaultValue={company.status}
                        className="rounded border bg-background px-3 py-2 text-xs"
                      >
                        <option value="draft">Draft</option>
                        <option value="queued">Queued</option>
                        <option value="provisioning">
                          Provisioning
                        </option>
                        <option value="ready">Ready</option>
                        <option value="failed">Failed</option>
                        <option value="suspended">Suspended</option>
                      </select>

                      <button
                        type="submit"
                        className="rounded bg-ink-950 px-3 py-2 text-xs font-medium text-white"
                      >
                        Save status
                      </button>
                    </form>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[var(--radius-md)] border border-dashed border-border p-8 text-center text-sm text-muted">
                No companies have been created yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}