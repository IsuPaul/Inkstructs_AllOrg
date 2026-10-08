import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { toggleOrganizationStatus } from "@/actions/organizations";
import {
  OrganizationSettingsForm,
  InviteMemberForm,
  RemoveMemberButton,
} from "./organization-forms";

async function submitOrganizationStatus(formData: FormData): Promise<void> {
  "use server";
  await toggleOrganizationStatus(formData);
}

export default async function OrganizationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const admin = createAdminClient();
  const [{ data: organization }, { data: members }] = await Promise.all([admin.from("organizations").select("id, name, slug, logo_url, primary_color, custom_domain, is_active").eq("id", id).single(), admin.from("organization_members").select("user_id, role, created_at, profiles(full_name, email)").eq("organization_id", id).order("created_at", { ascending: true })]);
  if (!organization) return <main className="p-8"><p>Organization not found.</p></main>;
  return <main className="p-6 sm:p-8"><div className="mx-auto max-w-6xl"><Link href="/admin/organizations" className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground"><ArrowLeft size={15} /> Organizations</Link><div className="mt-5 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-amber-600">Organization</p><h1 className="mt-2 font-display text-3xl text-foreground">{organization.name}</h1><p className="mt-2 text-sm text-muted">Dashboard link: <span className="font-medium text-foreground">/embed/{organization.slug}</span> · <span className={organization.is_active ? "text-success" : "text-danger"}>{organization.is_active ? "Active" : "Inactive"}</span></p></div><div className="flex gap-2"><form action={submitOrganizationStatus}><input type="hidden" name="organization_id" value={id} /><input type="hidden" name="is_active" value={String(!organization.is_active)} /><button className="rounded-[var(--radius-sm)] border border-border px-3 py-2 text-sm font-medium text-foreground" type="submit">{organization.is_active ? "Deactivate" : "Activate"}</button></form>{organization.is_active && <a href={`/embed/${organization.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] border border-border px-3 py-2 text-sm font-medium text-foreground">Preview dashboard <ExternalLink size={15} /></a>}</div></div><div className="mt-8 grid gap-6 lg:grid-cols-2"><OrganizationSettingsForm organization={organization} /><div><h2 className="mb-3 font-display text-lg text-foreground">Invite a member</h2><InviteMemberForm organizationId={id} /></div></div><section className="mt-8"><h2 className="font-display text-lg text-foreground">Members</h2><div className="mt-3 overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface">{members?.map((member) => { const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles; return <div key={member.user_id} className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4 last:border-b-0"><div><p className="font-medium text-foreground">{profile?.full_name || "Unnamed user"}</p><p className="text-xs text-muted">{profile?.email || "No email"}</p></div><div className="flex items-center gap-4"><span className="rounded-full bg-paper-100 px-2.5 py-1 text-xs capitalize text-muted">{member.role}</span><RemoveMemberButton organizationId={id} userId={member.user_id} /></div></div>; })}</div></section></div></main>;
}
