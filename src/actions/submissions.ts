"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function submitAssignment(
  lessonId: string,
  textAnswer: string,
  linkUrl: string,
  formData: FormData
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You're signed out. Please sign back in." };

  // Only one trial is allowed — check before doing any upload work, and the
  // unique constraint on (student_id, lesson_id) backs this up at the
  // database level in case of a race.
  const { data: existing } = await supabase
    .from("submissions")
    .select("id")
    .eq("student_id", user.id)
    .eq("lesson_id", lessonId)
    .maybeSingle();
  if (existing) return { error: "You've already submitted this assignment. Only one submission is allowed." };

  const file = formData.get("file");
  let fileUrl: string | null = null;

  if (file instanceof File && file.size > 0) {
    if (file.size > 20 * 1024 * 1024) return { error: "Please use a file under 20MB." };
    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const path = `${user.id}/${lessonId}/${Date.now()}-${safeName}`;
    const { error: uploadError } = await supabase.storage
      .from("submissions")
      .upload(path, file, { contentType: file.type });
    if (uploadError) return { error: "Couldn't upload your file." };
    fileUrl = path;
  }

  if (!textAnswer.trim() && !fileUrl && !linkUrl.trim()) {
    return { error: "Add some text, a file, or a link before submitting." };
  }

  const { error } = await supabase.from("submissions").insert({
    student_id: user.id,
    lesson_id: lessonId,
    text_answer: textAnswer || null,
    link_url: linkUrl || null,
    file_url: fileUrl,
    status: "submitted",
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "You've already submitted this assignment. Only one submission is allowed." };
    }
    return { error: "Couldn't submit your assignment." };
  }

  revalidatePath("/assignments");
  return { success: true };
}

export async function gradeSubmission(submissionId: string, grade: number | null, feedback: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You're signed out. Please sign back in." };

  const { error } = await supabase
    .from("submissions")
    .update({
      status: "graded",
      grade,
      feedback: feedback || null,
      graded_by: user.id,
      graded_at: new Date().toISOString(),
    })
    .eq("id", submissionId);

  if (error) return { error: "Couldn't save the grade." };
  revalidatePath("/teach/submissions");
  return { success: true };
}
