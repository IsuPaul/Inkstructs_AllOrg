"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

export async function inviteInstructor(
  _prevState: { error?: string; success?: boolean } | undefined,
  formData: FormData
) {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();

  if (!fullName || !email) return { error: "Enter a name and email." };

  const admin = createAdminClient();

  const { data: existing } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
  if (existing) return { error: "Someone with that email already has an account." };

  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName, role: "instructor" },
    redirectTo: `${env.siteUrl()}/auth/accept-invite`,
  });

  if (error) return { error: `Couldn't send the invite: ${error.message}` };

  revalidatePath("/admin/instructors");
  return { success: true };
}
