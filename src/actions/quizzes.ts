"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type QuizQuestionInput = {
  prompt: string;
  options: { text: string; is_correct: boolean }[];
};

export async function saveQuiz(
  weekId: string,
  title: string,
  instructions: string,
  questions: QuizQuestionInput[],
  allowRetake: boolean
) {
  if (!title.trim()) return { error: "Give the quiz a title." };
  if (questions.length === 0) return { error: "Add at least one question." };

  for (const q of questions) {
    if (!q.prompt.trim()) return { error: "Every question needs text." };
    if (q.options.filter((o) => o.text.trim()).length < 2) {
      return { error: "Every question needs at least two options." };
    }
    if (!q.options.some((o) => o.is_correct)) {
      return { error: "Mark the correct answer for every question." };
    }
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_or_update_quiz", {
    p_week_id: weekId,
    p_title: title,
    p_instructions: instructions || null,
    p_questions: questions.map((q) => ({
      prompt: q.prompt,
      options: q.options.filter((o) => o.text.trim()),
    })),
    p_allow_retake: allowRetake,
  });

  if (error) return { error: "Couldn't save the quiz. " + error.message };

  revalidatePath("/teach/quizzes");
  return { success: true };
}
