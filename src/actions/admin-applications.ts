"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

/**
 * Admin accepts an application: creates (or reuses) the auth user via invite,
 * links their profile, and creates an enrollment in the chosen course-within-
 * -cohort offering (a cohort can run several courses; this is which one and
 * which batch the student is being let into).
 *
 * If that offering is free (price_kobo = 0), the enrollment goes straight to
 * `active` — there's nothing to pay, so nothing should block access. If it's
 * paid, the enrollment starts as `pending_payment`; once Paystack confirms
 * payment (Phase 3 webhook), it flips to `active` and a second email goes
 * out with dashboard access. Either way, acceptance sends the invite
 * immediately so the student can set a password.
 */
export async function acceptApplication(applicationId: string, cohortCourseId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expired. Please sign in again." };

  const { data: application } = await supabase
    .from("applications")
    .select("id, full_name, email, course_id")
    .eq("id", applicationId)
    .single();
  if (!application) return { error: "Application not found." };

  const admin = createAdminClient();

  // Look up an existing profile by email first (a student can be accepted into a second course).
  const { data: existing } = await admin
    .from("profiles")
    .select("id")
    .eq("email", application.email)
    .maybeSingle();

  let studentId = existing?.id as string | undefined;

  if (!studentId) {
    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
      application.email,
      {
        data: { full_name: application.full_name, role: "student" },
        redirectTo: `${env.siteUrl()}/auth/accept-invite`,
      }
    );
    if (inviteError || !invited.user) {
      return { error: `Couldn't send the invite: ${inviteError?.message ?? "unknown error"}` };
    }
    studentId = invited.user.id;
  }

  const { data: offering } = await admin
    .from("cohort_courses")
    .select("price_kobo")
    .eq("id", cohortCourseId)
    .single();
  const isFree = !offering || offering.price_kobo === 0;
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

  await admin
    .from("applications")
    .update({ status: "accepted", reviewed_by: user.id, reviewed_at: new Date().toISOString() })
    .eq("id", applicationId);

  revalidatePath("/admin/applications");
  return { success: true };
}

export async function rejectApplication(applicationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session expired. Please sign in again." };

  const { error } = await supabase
    .from("applications")
    .update({ status: "rejected", reviewed_by: user.id, reviewed_at: new Date().toISOString() })
    .eq("id", applicationId);

  if (error) return { error: "Couldn't update the application." };
  revalidatePath("/admin/applications");
  return { success: true };
}
