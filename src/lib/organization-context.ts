import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types";

export async function requireOrganizationContext() {
  const h = await headers();
  const userId = h.get("x-profile-id");
  if (!userId) redirect("/login");
  const cookieStore = await cookies();
  const organizationId = cookieStore.get("active_organization_id")?.value || h.get("x-organization-id");
  if (!organizationId) redirect("/organizations");
  const supabase = await createClient();
  const { data: membership } = await supabase.from("organization_members").select("organization_id, role, organizations(id, name, slug, logo_url, primary_color)").eq("organization_id", organizationId).eq("user_id", userId).single();
  if (!membership) redirect("/organizations");
  return { organizationId: membership.organization_id, role: membership.role as UserRole, organization: Array.isArray(membership.organizations) ? membership.organizations[0] : membership.organizations };
}
