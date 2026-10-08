import { BookOpen } from "lucide-react";
import { TopBar } from "@/components/shell/topbar";
import { createClient } from "@/lib/supabase/server";
import { NewCourseForm } from "./new-course-form";
import { CourseRow } from "./course-row";

export default async function AdminCoursesPage() {
  const supabase = await createClient();
  const { data: courses } = await supabase
    .from("courses")
    .select("id, title, duration_weeks, days_per_week, is_published")
    .order("created_at", { ascending: false });

  return (
    <>
      <TopBar title="Courses" />
      <div className="space-y-6 p-5 sm:p-8">
        <div className="rounded-[var(--radius-md)] border border-border bg-surface p-6 shadow-[var(--shadow-xs)] sm:p-7">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-accent/15 text-amber-600">
              <BookOpen size={17} strokeWidth={1.75} />
            </span>
            <div>
              <h2 className="font-display text-lg leading-tight text-foreground">New course</h2>
              <p className="text-sm text-muted">Creates the empty week grid — add content from the builder next.</p>
            </div>
          </div>
          <div className="mt-5">
            <NewCourseForm />
          </div>
        </div>

        <div className="rounded-[var(--radius-md)] border border-border bg-surface px-5 shadow-[var(--shadow-xs)]">
          {!courses || courses.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">No courses yet.</p>
          ) : (
            courses.map((c) => (
              <CourseRow
                key={c.id}
                id={c.id}
                title={c.title}
                durationWeeks={c.duration_weeks}
                daysPerWeek={c.days_per_week}
                isPublished={c.is_published}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
}
