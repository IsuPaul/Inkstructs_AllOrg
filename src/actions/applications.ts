"use server";

import { createClient } from "@/lib/supabase/server";

export async function submitApplication(
  _prevState: { error?: string; success?: boolean } | undefined,
  formData: FormData
) {
  const full_name = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const course_id = String(formData.get("course_id") ?? "");
  const message = String(formData.get("message") ?? "").trim();

  if (!full_name || !email || !course_id) {
    return { error: "Fill in your name, email and choice of course." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("applications")
    .insert({ full_name, email, phone, course_id, message });

  if (error) return { error: "Something went wrong. Please try again." };
  return { success: true };
}
