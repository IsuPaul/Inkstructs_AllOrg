import { notFound } from "next/navigation";
import { TopBar } from "@/components/shell/topbar";
import { StatusBadge } from "@/components/ui/status-badge";
import { createClient } from "@/lib/supabase/server";
import { AnnouncementForm } from "./announcement-form";

export default async function InstructorCohortCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: offering } = await supabase
    .from("cohort_courses")
    .select("id, courses(title), cohorts(name)")
    .eq("id", id)
    .single();
  if (!offering) notFound();

  const [{ data: students }, { data: announcements }] = await Promise.all([
    supabase.from("enrollments").select("id, status, profiles(full_name, email)").eq("cohort_course_id", id),
    supabase
      .from("announcements")
      .select("id, title, body, created_at")
      .eq("cohort_course_id", id)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <TopBar title={`${(offering as any).courses?.title} — ${(offering as any).cohorts?.name}`} />
      <div className="space-y-6 p-5 sm:p-8">
        <div className="rounded-[var(--radius-md)] border border-border bg-surface p-5">
          <h2 className="text-lg font-bold text-foreground">Post an announcement</h2>
          <div className="mt-3">
            <AnnouncementForm cohortCourseId={id} />
          </div>
          {announcements && announcements.length > 0 && (
            <div className="mt-5 space-y-3 border-t border-border pt-4">
              {announcements.map((a) => (
                <div key={a.id}>
                  <p className="text-sm font-medium text-foreground">{a.title}</p>
                  <p className="text-sm text-muted">{a.body}</p>
                  <p className="mt-0.5 text-xs text-muted">{new Date(a.created_at).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <h2 className="text-sm font-medium text-muted">Students</h2>
        <div className="mt-3 rounded-[var(--radius-md)] border border-border bg-surface px-5 shadow-[var(--shadow-xs)]">
          {!students || students.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">No students enrolled in this course yet.</p>
          ) : (
            /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
            students.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between rounded-[10px] border-b border-border px-1 py-4 transition-colors last:border-0 hover:bg-paper-100/50">
                <div>
                  <p className="text-sm font-medium text-foreground">{s.profiles?.full_name}</p>
                  <p className="text-xs text-muted">{s.profiles?.email}</p>
                </div>
                <StatusBadge tone={s.status === "active" ? "success" : "neutral"}>{s.status}</StatusBadge>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
