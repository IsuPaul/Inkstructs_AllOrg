"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

/**
 * Deactivates or reactivates an instructor or student account. A deactivated
 * account is signed out on its next request (checked in middleware) and
 * can't sign back in until reactivated — the account itself still exists,
 * so nothing is deleted and this is fully reversible.
 */
export async function setUserActive(userId: string, isActive: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ is_active: isActive }).eq("id", userId);
  if (error) return { error: "Couldn't update that account." };

  revalidatePath("/admin/students");
  revalidatePath("/admin/instructors");
  return { success: true };
}

/**
 * Invites a student straight into a specific course-within-cohort, bypassing
 * the /apply form — for admins who already know who they want in (a
 * referral, a manual sale, a scholarship). The admin decides right here
 * whether this student pays or gets free access.
 */
export async function inviteStudentToCohortCourse(
  cohortCourseId: string,
  fullName: string,
  email: string,
  isFree: boolean
) {
  if (!fullName.trim() || !email.trim()) return { error: "Enter a name and email." };

  const admin = createAdminClient();

  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  let studentId = existingProfile?.id as string | undefined;

  if (!studentId) {
    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName, role: "student" },
      redirectTo: `${env.siteUrl()}/auth/accept-invite`,
    });
    if (inviteError || !invited.user) {
      return { error: `Couldn't send the invite: ${inviteError?.message ?? "unknown error"}` };
    }
    studentId = invited.user.id;
  }

  const now = new Date().toISOString();
  const { error: enrollError } = await admin.from("enrollments").upsert(
    {
      student_id: studentId,
      cohort_course_id: cohortCourseId,
      status: isFree ? "active" : "pending_payment",
      invited_at: now,
      joined_at: isFree ? now : null,
    },
    { onConflict: "student_id,cohort_course_id" }
  );
  if (enrollError) return { error: "Couldn't create the enrollment." };

  revalidatePath("/admin/cohorts", "layout");
  return { success: true };
}
