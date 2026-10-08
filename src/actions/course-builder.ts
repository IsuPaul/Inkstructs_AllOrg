"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addModule(
  weekId: string,
  dayNumber: number,
  title: string,
  description: string,
  availableAt: string | null
) {
  if (!title.trim()) return { error: "Give the module a title." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("modules")
    .insert({ week_id: weekId, day_number: dayNumber, title, description: description || null, available_at: availableAt });

  if (error) return { error: "Couldn't add the module." };
  revalidatePath("/admin/courses", "layout");
  revalidatePath("/teach", "layout");
  return { success: true };
}

export async function updateModuleAvailability(moduleId: string, availableAt: string | null) {
  const supabase = await createClient();
  const { error } = await supabase.from("modules").update({ available_at: availableAt }).eq("id", moduleId);
  if (error) return { error: "Couldn't update availability." };
  revalidatePath("/admin/courses", "layout");
  revalidatePath("/teach", "layout");
  return { success: true };
}

export async function deleteModule(moduleId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("modules").delete().eq("id", moduleId);
  if (error) return { error: "Couldn't delete the module." };
  revalidatePath("/admin/courses", "layout");
  revalidatePath("/teach", "layout");
  return { success: true };
}

export type GradingConfig = {
  gradingType: "fraction" | "whole_number" | null;
  gradingUnit: "percentage" | "unitless" | null;
  maxScore: number | null;
};

export async function addLesson(
  moduleId: string,
  title: string,
  type: string,
  contentText: string,
  externalUrl: string,
  isRequired: boolean,
  grading?: GradingConfig
) {
  if (!title.trim()) return { error: "Give the lesson a title." };

  const supabase = await createClient();

  const { count } = await supabase
    .from("lessons")
    .select("id", { count: "exact", head: true })
    .eq("module_id", moduleId);

  const { data, error } = await supabase
    .from("lessons")
    .insert({
      module_id: moduleId,
      title,
      type,
      content_text: contentText || null,
      external_url: externalUrl || null,
      is_required: isRequired,
      position: count ?? 0,
      grading_type: grading?.gradingType ?? null,
      grading_unit: grading?.gradingUnit ?? null,
      max_score: grading?.maxScore ?? null,
    })
    .select("id")
    .single();

  if (error || !data) return { error: "Couldn't add the lesson." };
  revalidatePath("/admin/courses", "layout");
  revalidatePath("/teach", "layout");
  return { success: true, lessonId: data.id };
}

export async function updateLesson(
  lessonId: string,
  title: string,
  contentText: string,
  externalUrl: string,
  isRequired: boolean,
  grading?: GradingConfig
) {
  if (!title.trim()) return { error: "Give the lesson a title." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("lessons")
    .update({
      title,
      content_text: contentText || null,
      external_url: externalUrl || null,
      is_required: isRequired,
      ...(grading
        ? {
            grading_type: grading.gradingType,
            grading_unit: grading.gradingUnit,
            max_score: grading.maxScore,
          }
        : {}),
    })
    .eq("id", lessonId);

  if (error) return { error: "Couldn't save the lesson." };
  revalidatePath("/admin/courses", "layout");
  revalidatePath("/teach", "layout");
  return { success: true };
}

export async function deleteLesson(lessonId: string) {
  const supabase = await createClient();

  // Clean up any uploaded file/video before removing the row.
  const { data: assets } = await supabase
    .from("assets")
    .select("storage_path")
    .eq("lesson_id", lessonId);
  for (const a of assets ?? []) {
    if (a.storage_path) await supabase.storage.from("course-materials").remove([a.storage_path]);
  }

  const { error } = await supabase.from("lessons").delete().eq("id", lessonId);
  if (error) return { error: "Couldn't delete the lesson." };
  revalidatePath("/admin/courses", "layout");
  revalidatePath("/teach", "layout");
  return { success: true };
}
