"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function markLessonComplete(lessonId: string, courseSlug: string, moduleId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You're signed out. Please sign back in." };

  const { error } = await supabase
    .from("lesson_progress")
    .upsert({ student_id: user.id, lesson_id: lessonId }, { onConflict: "student_id,lesson_id" });

  if (error) return { error: "Couldn't save your progress. Try again." };

  revalidatePath(`/courses/${courseSlug}`);
  revalidatePath(`/courses/${courseSlug}/modules/${moduleId}`);
  return { success: true };
}

export async function markLessonIncomplete(lessonId: string, courseSlug: string, moduleId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You're signed out. Please sign back in." };

  const { error } = await supabase
    .from("lesson_progress")
    .delete()
    .eq("student_id", user.id)
    .eq("lesson_id", lessonId);

  if (error) return { error: "Couldn't update your progress. Try again." };

  revalidatePath(`/courses/${courseSlug}`);
  revalidatePath(`/courses/${courseSlug}/modules/${moduleId}`);
  return { success: true };
}
