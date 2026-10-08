"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function postAnnouncement(
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  const cohortCourseId = String(formData.get("cohort_course_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!title || !body) return { error: "Add a title and message." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You're signed out. Please sign back in." };

  const { error } = await supabase
    .from("announcements")
    .insert({ cohort_course_id: cohortCourseId, author_id: user.id, title, body });

  if (error) return { error: "Couldn't post that. Try again." };

  revalidatePath(`/teach/cohorts/${cohortCourseId}`);
  revalidatePath("/teach/announcements");
  return { success: true };
}
