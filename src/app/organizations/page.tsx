import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { chooseOrganization } from "./actions";

async function submitChooseOrganization(
  formData: FormData
): Promise<void> {
  "use server";

  await chooseOrganization(formData);
}

export default async function OrganizationsSelectPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: memberships } = await supabase
    .from("organization_members")
    .select("organization_id, role, organizations(name, slug)")
    .eq("user_id", profile.id)
    .order("created_at");

  return (
    <main className="min-h-dvh bg-background p-6 sm:p-10">
      <div className="mx-auto max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-600">
          Inkstructs workspace
        </p>

        <h1 className="mt-3 font-display text-3xl text-foreground">
          Choose an organization
        </h1>

        <p className="mt-2 text-sm text-muted">
          Your role and dashboard permissions will use the selected
          organization.
        </p>

        <div className="mt-8 grid gap-3">
          {memberships?.map((membership) => {
            const organization = Array.isArray(membership.organizations)
              ? membership.organizations[0]
              : membership.organizations;

            return (
              <form
                action={submitChooseOrganization}
                key={membership.organization_id}
              >
                <input
                  type="hidden"
                  name="organization_id"
                  value={membership.organization_id}
                />

                <button
                  type="submit"
                  className="flex w-full items-center justify-between rounded-[var(--radius-md)] border border-border bg-surface p-5 text-left transition hover:-translate-y-px hover:shadow-[var(--shadow-md)]"
                >
                  <span>
                    <strong className="block text-foreground">
                      {organization?.name}
                    </strong>

                    <small className="mt-1 block text-muted">
                      {organization?.slug}
                    </small>
                  </span>

                  <span className="rounded-full bg-paper-100 px-3 py-1 text-xs capitalize text-muted">
                    {membership.role}
                  </span>
                </button>
              </form>
            );
          })}
        </div>
      </div>
    </main>
  );
}