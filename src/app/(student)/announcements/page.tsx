import { TopBar } from "@/components/shell/topbar";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";

export default async function StudentAnnouncementsPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("cohort_course_id")
    .eq("student_id", profile.id)
    .in("status", ["active", "completed"]);

  const cohortCourseIds = (enrollments ?? []).map((e) => e.cohort_course_id);

  const { data: announcements } = await supabase
    .from("announcements")
    .select("id, title, body, created_at, cohort_courses(cohorts(name), courses(title))")
    .in("cohort_course_id", cohortCourseIds.length ? cohortCourseIds : ["00000000-0000-0000-0000-000000000000"])
    .order("created_at", { ascending: false });

  // Visiting this page marks everything currently shown as read, which is
  // what clears the red dot in the sidebar.
  if (announcements && announcements.length > 0) {
    await supabase.from("announcement_reads").upsert(
      announcements.map((a) => ({ student_id: profile.id, announcement_id: a.id })),
      { onConflict: "student_id,announcement_id", ignoreDuplicates: true }
    );
  }

  return (
    <>
      <TopBar title="Announcements" />
      <div className="p-5 sm:p-8">
        {!announcements || announcements.length === 0 ? (
          <p className="text-sm text-muted">No announcements yet.</p>
        ) : (
          <div className="space-y-3">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {announcements.map((a: any) => (
              <div key={a.id} className="rounded-[var(--radius-md)] border border-border bg-surface p-4">
                <p className="text-xs text-muted">
                  {a.cohort_courses?.courses?.title} — {a.cohort_courses?.cohorts?.name}
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">{a.title}</p>
                <p className="mt-1 text-sm text-muted">{a.body}</p>
                <p className="mt-2 text-xs text-muted">{new Date(a.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
