"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function chooseOrganization(formData: FormData) {
  const profile = await requireProfile();
  const organizationId = String(formData.get("organization_id") || "");
  const supabase = await createClient();
  const { data: membership } = await supabase.from("organization_members").select("organization_id").eq("organization_id", organizationId).eq("user_id", profile.id).maybeSingle();
  if (!membership) return { error: "You are not a member of that organization." };
  const cookieStore = await cookies();
  cookieStore.set("active_organization_id", organizationId, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" });
  redirect("/dashboard");
}
