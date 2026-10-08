"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function slugify(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function createCourse(_prev: { error?: string } | undefined, formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const duration_weeks = Number(formData.get("duration_weeks") ?? 4);
  const days_per_week = Number(formData.get("days_per_week") ?? 5);
  const description = String(formData.get("description") ?? "").trim();

  if (!title) return { error: "Give the course a title." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: course, error } = await supabase
    .from("courses")
    .insert({
      title,
      slug: slugify(title),
      description,
      duration_weeks,
      days_per_week,
      created_by: user?.id,
    })
    .select("id")
    .single();

  if (error || !course) return { error: "Couldn't create the course. Check the title is unique." };

  // Generate the empty week/day grid so the admin can fill it in from the builder.
  const weekRows = Array.from({ length: duration_weeks }, (_, i) => ({
    course_id: course.id,
    week_number: i + 1,
    title: `Week ${i + 1}`,
  }));
  await supabase.from("weeks").insert(weekRows);

  revalidatePath("/admin/courses");
  return { success: true };
}

export async function setCoursePublished(courseId: string, published: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("courses").update({ is_published: published }).eq("id", courseId);
  if (error) return { error: "Couldn't update the course." };
  revalidatePath("/admin/courses");
  revalidatePath("/apply");
  revalidatePath("/");
  return { success: true };
}

/**
 * Changes a course's length. Growing it just appends empty weeks. Shrinking
 * it is blocked if any of the weeks being removed already have modules in
 * them — those would cascade-delete real content (and any student progress
 * against it), so that has to be a deliberate, separate action from the
 * course builder first.
 */
export async function updateCourseDuration(courseId: string, newDuration: number) {
  if (!Number.isFinite(newDuration) || newDuration < 1) return { error: "A course needs at least 1 week." };

  const supabase = await createClient();
  const { data: course } = await supabase.from("courses").select("duration_weeks").eq("id", courseId).single();
  if (!course) return { error: "Course not found." };

  const current = course.duration_weeks;
  if (newDuration === current) return { success: true };

  if (newDuration > current) {
    const newWeeks = Array.from({ length: newDuration - current }, (_, i) => ({
      course_id: courseId,
      week_number: current + i + 1,
      title: `Week ${current + i + 1}`,
    }));
    const { error: insertError } = await supabase.from("weeks").insert(newWeeks);
    if (insertError) return { error: "Couldn't add the new weeks." };
  } else {
    const { data: weeksToRemove } = await supabase
      .from("weeks")
      .select("id, week_number, modules(id)")
      .eq("course_id", courseId)
      .gt("week_number", newDuration);

    const withContent = (weeksToRemove ?? []).filter((w) => (w.modules?.length ?? 0) > 0);
    if (withContent.length > 0) {
      const list = withContent.map((w) => w.week_number).join(", ");
      return {
        error: `Week${withContent.length === 1 ? "" : "s"} ${list} already ${withContent.length === 1 ? "has" : "have"} modules in it. Delete that content from the course builder first, or keep the course at ${current} weeks.`,
      };
    }

    const idsToDelete = (weeksToRemove ?? []).map((w) => w.id);
    if (idsToDelete.length > 0) {
      const { error: deleteError } = await supabase.from("weeks").delete().in("id", idsToDelete);
      if (deleteError) return { error: "Couldn't remove the extra weeks." };
    }
  }

  const { error: updateError } = await supabase
    .from("courses")
    .update({ duration_weeks: newDuration })
    .eq("id", courseId);
  if (updateError) return { error: "Couldn't update the course." };

  revalidatePath("/admin/courses");
  revalidatePath(`/admin/courses/${courseId}/builder`);
  return { success: true };
}

// ===================== Cohorts (course-less intake/batch) =====================

export async function createCohort(_prev: { error?: string } | undefined, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const start_date = String(formData.get("start_date") ?? "");

  if (!name || !start_date) return { error: "Fill in the cohort name and start date." };

  const supabase = await createClient();
  const { error } = await supabase.from("cohorts").insert({ name, start_date, status: "open" });

  if (error) return { error: "Couldn't create the cohort." };

  revalidatePath("/admin/cohorts");
  return { success: true };
}

export async function updateCohort(cohortId: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const start_date = String(formData.get("start_date") ?? "");

  if (!name || !start_date) return { error: "Fill in the cohort name and start date." };

  const supabase = await createClient();
  const { error } = await supabase.from("cohorts").update({ name, start_date }).eq("id", cohortId);

  if (error) return { error: "Couldn't update the cohort." };

  revalidatePath(`/admin/cohorts/${cohortId}`);
  revalidatePath("/admin/cohorts");
  return { success: true };
}

export async function updateCohortStatus(cohortId: string, status: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("cohorts").update({ status }).eq("id", cohortId);
  if (error) return { error: "Couldn't update the cohort." };
  revalidatePath(`/admin/cohorts/${cohortId}`);
  revalidatePath("/admin/cohorts");
  return { success: true };
}

/**
 * Deleting a cohort cascades to every course offered under it, and from
 * there to enrollments, payments and certificates. Blocked outright once
 * any course under it has a single student enrolled — mark it "completed"
 * instead. Only ever deletes a cohort nobody has joined yet.
 */
export async function deleteCohort(cohortId: string) {
  const supabase = await createClient();

  const { data: offerings } = await supabase.from("cohort_courses").select("id").eq("cohort_id", cohortId);
  const cohortCourseIds = (offerings ?? []).map((o) => o.id);

  if (cohortCourseIds.length > 0) {
    const { count } = await supabase
      .from("enrollments")
      .select("id", { count: "exact", head: true })
      .in("cohort_course_id", cohortCourseIds);

    if (count && count > 0) {
      return {
        error: `This cohort has ${count} enrolled student${count === 1 ? "" : "s"} across its courses. Deleting it would also delete their enrollment, payment and certificate records, so it's blocked. Mark it "completed" instead, or move the students first.`,
      };
    }
  }

  const { error } = await supabase.from("cohorts").delete().eq("id", cohortId);
  if (error) return { error: "Couldn't delete the cohort." };

  revalidatePath("/admin/cohorts");
  return { success: true };
}

// ===================== Courses within a cohort =====================

export async function addCourseToCohort(cohortId: string, formData: FormData) {
  const course_id = String(formData.get("course_id") ?? "");
  const price_kobo = Math.round(Number(formData.get("price_naira") ?? 0) * 100);
  const capacityRaw = String(formData.get("capacity") ?? "").trim();
  const capacity = capacityRaw ? Number(capacityRaw) : null;

  if (!course_id) return { error: "Choose a course to add." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("cohort_courses")
    .insert({ cohort_id: cohortId, course_id, price_kobo, capacity });

  if (error) {
    if (error.code === "23505") return { error: "That course is already offered in this cohort." };
    return { error: "Couldn't add that course to the cohort." };
  }

  revalidatePath(`/admin/cohorts/${cohortId}`);
  return { success: true };
}

export async function updateCohortCourse(cohortCourseId: string, cohortId: string, formData: FormData) {
  const price_kobo = Math.round(Number(formData.get("price_naira") ?? 0) * 100);
  const capacityRaw = String(formData.get("capacity") ?? "").trim();
  const capacity = capacityRaw ? Number(capacityRaw) : null;

  const supabase = await createClient();
  const { error } = await supabase
    .from("cohort_courses")
    .update({ price_kobo, capacity })
    .eq("id", cohortCourseId);

  if (error) return { error: "Couldn't update that course offering." };

  revalidatePath(`/admin/cohorts/${cohortId}`);
  return { success: true };
}

/** Blocked once a student has enrolled in this specific course-within-cohort — same reasoning as deleteCohort. */
export async function removeCourseFromCohort(cohortCourseId: string, cohortId: string) {
  const supabase = await createClient();

  const { count } = await supabase
    .from("enrollments")
    .select("id", { count: "exact", head: true })
    .eq("cohort_course_id", cohortCourseId);

  if (count && count > 0) {
    return {
      error: `${count} student${count === 1 ? " is" : "s are"} enrolled in this course under this cohort. Remove them first, or leave the course here.`,
    };
  }

  const { error } = await supabase.from("cohort_courses").delete().eq("id", cohortCourseId);
  if (error) return { error: "Couldn't remove that course." };

  revalidatePath(`/admin/cohorts/${cohortId}`);
  return { success: true };
}

export async function assignInstructor(cohortCourseId: string, instructorId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("cohort_instructors")
    .upsert(
      { cohort_course_id: cohortCourseId, instructor_id: instructorId, role: "lead" },
      { onConflict: "cohort_course_id,instructor_id" }
    );
  if (error) return { error: "Couldn't assign that instructor." };
  revalidatePath("/admin/cohorts", "layout");
  return { success: true };
}

export async function removeInstructor(cohortCourseId: string, instructorId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("cohort_instructors")
    .delete()
    .eq("cohort_course_id", cohortCourseId)
    .eq("instructor_id", instructorId);
  if (error) return { error: "Couldn't remove that instructor." };
  revalidatePath("/admin/cohorts", "layout");
  return { success: true };
}
