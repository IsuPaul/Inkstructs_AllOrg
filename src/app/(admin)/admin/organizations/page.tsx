import { createAdminClient } from "@/lib/supabase/admin";
import { createOrganization } from "@/actions/organizations";
import Link from "next/link";
import { CreateOrganizationForm } from "./create-organization-form";

export default async function OrganizationsPage() {
  const supabase = createAdminClient();
  const { data: organizations } = await supabase.from("organizations").select("id, name, slug, primary_color, custom_domain, is_active, created_at").order("created_at", { ascending: false });
  return <main className="p-6 sm:p-8"><div className="mx-auto max-w-5xl"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-amber-600">Partner platform</p><h1 className="mt-2 font-display text-3xl text-foreground">Organizations</h1><p className="mt-2 text-sm text-muted">Create branded dashboard spaces for schools and learning platforms.</p></div></div><div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.4fr]"><CreateOrganizationForm /><div className="space-y-3">{organizations?.length ? organizations.map((org) => <Link href={`/admin/organizations/${org.id}`} key={org.id} className="flex items-center justify-between gap-4 rounded-[var(--radius-md)] border border-border bg-surface p-5 transition hover:-translate-y-px hover:shadow-[var(--shadow-sm)]"><div className="flex items-center gap-3"><span className={`h-9 w-9 rounded-lg ${org.is_active ? "bg-success" : "bg-danger"}`} /><div><p className="font-medium text-foreground">{org.name}</p><p className="text-xs text-muted">/embed/{org.slug} · {org.is_active ? "Active" : "Inactive"}</p></div></div><span className="text-xs text-muted">{org.custom_domain || "No custom domain"}</span></Link>) : <div className="rounded-[var(--radius-md)] border border-dashed border-border p-8 text-center text-sm text-muted">No partner organizations yet.</div>}</div></div></div></main>;
}
