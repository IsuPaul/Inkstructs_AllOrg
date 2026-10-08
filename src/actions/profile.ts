"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateProfile(
  _prevState: { error?: string; success?: boolean } | undefined,
  formData: FormData
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You're signed out. Please sign back in." };

  const full_name = String(formData.get("full_name") ?? "").trim();
  const date_of_birth = String(formData.get("date_of_birth") ?? "") || null;
  const state_of_origin = String(formData.get("state_of_origin") ?? "") || null;
  const avatar = formData.get("avatar");

  if (!full_name) return { error: "Your name can't be empty." };

  // Whitelist explicitly — never trust the form to carry `role` or `email`,
  // even though nothing in this form currently sends them.
  const updates: Record<string, unknown> = { full_name, date_of_birth, state_of_origin };

  if (avatar instanceof File && avatar.size > 0) {
    if (avatar.size > 3 * 1024 * 1024) return { error: "Please use an image under 3MB." };

    const ext = avatar.name.split(".").pop() ?? "jpg";
    const path = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, avatar, { upsert: true, contentType: avatar.type });

    if (uploadError) return { error: "Couldn't upload that image. Try a different file." };

    const { data: publicUrl } = supabase.storage.from("avatars").getPublicUrl(path);
    // Cache-bust so the new photo shows immediately instead of a stale cached one.
    updates.avatar_url = `${publicUrl.publicUrl}?v=${Date.now()}`;
  }

  const { error } = await supabase.from("profiles").update(updates).eq("id", user.id);
  if (error) return { error: "Couldn't save your changes. Try again." };

  revalidatePath("/profile");
  return { success: true };
}
