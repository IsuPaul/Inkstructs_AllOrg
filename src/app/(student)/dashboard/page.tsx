import { GraduationCap } from "lucide-react";
import { TopBar } from "@/components/shell/topbar";
import { CourseCard } from "@/components/course/course-card";
import { EmptyState } from "@/components/ui/empty-state";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";

export default async function StudentDashboard() {
  const profile = await requireProfile();
  const supabase = await createClient();

  // Independent queries — run together instead of one after another.
  const [{ data: enrollments }, { data: progress }, { data: resumePoints }, { data: courseProgress }] =
    await Promise.all([
      supabase
        .from("enrollments")
        .select("id, status, cohort_courses(id, cohorts(name), courses(id, slug, title, duration_weeks))")
        .eq("student_id", profile.id)
        .in("status", ["active", "completed"]),
      supabase.from("week_progress").select("course_id, is_complete").eq("student_id", profile.id),
      supabase
        .from("last_viewed_module")
        .select("course_id, module_id, modules(title)")
        .eq("student_id", profile.id),
      // The real course percentage — see course_progress view: completed
      // lessons weighted by how many weeks actually have content yet.
      supabase.from("course_progress").select("course_id, percent_complete").eq("student_id", profile.id),
    ]);

  const completedWeeksByCourse = new Map<string, number>();
  for (const row of progress ?? []) {
    if (row.is_complete) {
      completedWeeksByCourse.set(row.course_id, (completedWeeksByCourse.get(row.course_id) ?? 0) + 1);
    }
  }

  const resumeByCourse = new Map<string, { moduleId: string; moduleTitle: string }>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of (resumePoints ?? []) as any[]) {
    resumeByCourse.set(r.course_id, { moduleId: r.module_id, moduleTitle: r.modules?.title ?? "" });
  }

  const percentByCourse = new Map((courseProgress ?? []).map((r) => [r.course_id, r.percent_complete]));

  return (
    <>
      <TopBar title={`Welcome back, ${profile.full_name.split(" ")[0]}`} subtitle="Here's where you left off" />
      <div className="p-5 sm:p-8">
        {!enrollments || enrollments.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="No courses yet"
            description="Once you're accepted and your payment is confirmed, your course will appear here."
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {enrollments.map((e: any) => {
              const course = e.cohort_courses?.courses;
              if (!course) return null;
              const resume = resumeByCourse.get(course.id);
              return (
                <CourseCard
                  key={e.id}
                  slug={course.slug}
                  title={course.title}
                  cohortName={e.cohort_courses.cohorts?.name ?? ""}
                  totalWeeks={course.duration_weeks}
                  completedWeeks={completedWeeksByCourse.get(course.id) ?? 0}
                  resumeModuleId={resume?.moduleId}
                  nextLessonTitle={resume?.moduleTitle}
                  percent={percentByCourse.get(course.id) ?? 0}
                />
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
