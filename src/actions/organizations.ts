"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { requireProfile } from "@/lib/auth";

export async function createOrganization(_previousState: { error?: string; success?: boolean } | undefined, formData: FormData) {
  const profile = await requireProfile();
  if (profile.role !== "admin") return { error: "Only administrators can manage organizations." };
  const supabase = await createClient();
  const name = String(formData.get("name") || "").trim();
  const slug = String(formData.get("slug") || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
  const primaryColor = String(formData.get("primary_color") || "#e8a33d").trim();
  if (!name || !slug) return { error: "Organization name and slug are required." };
  const { data: organization, error } = await supabase.from("organizations").insert({ name, slug, primary_color: primaryColor }).select("id").single();
  if (error || !organization) return { error: error?.message || "Could not create organization." };
  const { error: membershipError } = await createAdminClient().from("organization_members").upsert({ organization_id: organization.id, user_id: profile.id, role: "admin" }, { onConflict: "organization_id,user_id" });
  if (membershipError) return { error: `Organization created, but membership setup failed: ${membershipError.message}` };
  revalidatePath("/admin/organizations");
  return { success: true };
}

export async function updateOrganization(_previousState: { error?: string; success?: boolean } | undefined, formData: FormData) {
  const profile = await requireProfile();
  if (profile.role !== "admin") return { error: "Only administrators can manage organizations." };
  const id = String(formData.get("organization_id") || "");
  const name = String(formData.get("name") || "").trim();
  const logoUrl = String(formData.get("logo_url") || "").trim() || null;
  const primaryColor = String(formData.get("primary_color") || "#e8a33d");
  const domain = String(formData.get("custom_domain") || "").trim() || null;
  const admin = createAdminClient();
  const { error } = await admin.from("organizations").update({ name, logo_url: logoUrl, primary_color: primaryColor, custom_domain: domain }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/admin/organizations/${id}`); revalidatePath("/admin/organizations");
  return { success: true };
}

export async function inviteOrganizationMember(_previousState: { error?: string; success?: boolean } | undefined, formData: FormData) {
  const profile = await requireProfile();
  if (profile.role !== "admin") return { error: "Only administrators can manage organizations." };
  const organizationId = String(formData.get("organization_id") || "");
  const fullName = String(formData.get("full_name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const role = String(formData.get("role") || "student") as "admin" | "instructor" | "student";
  if (!organizationId || !fullName || !email) return { error: "Enter a name and email." };
  const admin = createAdminClient();
  const existing = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
  let userId = existing.data?.id;
  if (!userId) {
    const invited = await admin.auth.admin.inviteUserByEmail(email, { data: { full_name: fullName, role }, redirectTo: `${env.siteUrl()}/auth/accept-invite` });
    if (invited.error || !invited.data.user) return { error: invited.error?.message || "Could not send invite." };
    userId = invited.data.user.id;
  }
  const { error: profileError } = await admin.from("profiles").upsert({ id: userId, full_name: fullName, email, role }, { onConflict: "id" });
  if (profileError) return { error: `Invite sent, but the user profile could not be prepared: ${profileError.message}` };
  const { error } = await admin.from("organization_members").upsert({ organization_id: organizationId, user_id: userId, role }, { onConflict: "organization_id,user_id" });
  if (error) return { error: error.message };
  const { data: currentProfile } = await admin.from("profiles").select("default_organization_id, organization_id").eq("id", userId).single();
  if (!currentProfile?.default_organization_id) {
    await admin.from("profiles").update({ default_organization_id: organizationId, organization_id: currentProfile?.organization_id ?? organizationId }).eq("id", userId);
  }
  revalidatePath(`/admin/organizations/${organizationId}`);
  return { success: true };
}

export async function removeOrganizationMember(_previousState: { error?: string; success?: boolean } | undefined, formData: FormData) {
  const profile = await requireProfile();
  if (profile.role !== "admin") return { error: "Only administrators can manage organizations." };
  const organizationId = String(formData.get("organization_id") || "");
  const userId = String(formData.get("user_id") || "");
  const admin = createAdminClient();
  const { error } = await admin.from("organization_members").delete().eq("organization_id", organizationId).eq("user_id", userId);
  if (error) return { error: error.message };
  revalidatePath(`/admin/organizations/${organizationId}`);
  return { success: true };
}

export async function toggleOrganizationStatus(formData: FormData) {
  const profile = await requireProfile();
  if (profile.role !== "admin") return { error: "Only administrators can manage organizations." };
  const id = String(formData.get("organization_id") || "");
  const nextStatus = String(formData.get("is_active") || "false") === "true";
  const admin = createAdminClient();
  const { error } = await admin.from("organizations").update({ is_active: nextStatus }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/organizations"); revalidatePath(`/admin/organizations/${id}`);
  return { success: true };
}
