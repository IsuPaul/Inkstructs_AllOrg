import Link from "next/link";
import { TopBar } from "@/components/shell/topbar";
import { StatusBadge } from "@/components/ui/status-badge";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";

export default async function InstructorQuizzesPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  // Courses this instructor teaches, via their cohort-course assignments.
  const { data: rows } = await supabase
    .from("cohort_instructors")
    .select("cohort_courses(courses(id, title))")
    .eq("instructor_id", profile.id);

  const courseMap = new Map<string, string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of (rows ?? []) as any[]) {
    const c = r.cohort_courses?.courses;
    if (c) courseMap.set(c.id, c.title);
  }
  const courseIds = Array.from(courseMap.keys());

  const { data: weeks } = await supabase
    .from("weeks")
    .select("id, week_number, title, course_id, quizzes(id, title)")
    .in("course_id", courseIds.length ? courseIds : ["00000000-0000-0000-0000-000000000000"])
    .order("week_number");

  const weeksByCourse = new Map<string, typeof weeks>();
  for (const w of weeks ?? []) {
    const list = weeksByCourse.get(w.course_id) ?? [];
    list.push(w);
    weeksByCourse.set(w.course_id, list as never);
  }

  return (
    <>
      <TopBar title="Quizzes" />
      <div className="space-y-6 p-5 sm:p-8">
        {courseIds.length === 0 ? (
          <p className="text-sm text-muted">You&apos;re not assigned to any cohort yet.</p>
        ) : (
          courseIds.map((courseId) => (
            <div key={courseId} className="rounded-[var(--radius-md)] border border-border bg-surface px-5 shadow-[var(--shadow-xs)]">
              <h2 className="font-display border-b border-border py-3 text-lg text-foreground">
                {courseMap.get(courseId)}
              </h2>
              {(weeksByCourse.get(courseId) ?? []).map((w) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const quiz = (w as any).quizzes;
                return (
                  <Link
                    key={w.id}
                    href={`/teach/quizzes/${w.id}`}
                    className="flex items-center justify-between border-b border-border py-3 last:border-0 hover:bg-paper-100"
                  >
                    <div>
                      <p className="text-xs text-muted">Week {w.week_number}</p>
                      <p className="text-sm text-foreground">{w.title}</p>
                    </div>
                    <StatusBadge tone={quiz ? "success" : "neutral"}>
                      {quiz ? "Quiz added" : "No quiz yet"}
                    </StatusBadge>
                  </Link>
                );
              })}
            </div>
          ))
        )}
      </div>
    </>
  );
}
