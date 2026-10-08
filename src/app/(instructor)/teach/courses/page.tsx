import Link from "next/link";
import { BookOpen, ArrowRight } from "lucide-react";
import { TopBar } from "@/components/shell/topbar";
import { EmptyState } from "@/components/ui/empty-state";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";

export default async function InstructorCoursesPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("cohort_instructors")
    .select("cohort_courses(courses(id, title, duration_weeks))")
    .eq("instructor_id", profile.id);

  const courseMap = new Map<string, { id: string; title: string; duration_weeks: number }>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of (rows ?? []) as any[]) {
    const c = r.cohort_courses?.courses;
    if (c) courseMap.set(c.id, c);
  }

  return (
    <>
      <TopBar title="Courses" subtitle="Manage weeks, modules and lessons" />
      <div className="p-5 sm:p-8">
        {courseMap.size === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Nothing to manage yet"
            description="You're not assigned to any cohort yet — once you are, its course will appear here."
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {Array.from(courseMap.values()).map((c) => (
              <Link
                key={c.id}
                href={`/teach/courses/${c.id}/builder`}
                className="group relative overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface p-5 shadow-[var(--shadow-xs)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]"
              >
                <div className="h-1 w-10 rounded-full bg-accent transition-all group-hover:w-16" />
                <p className="font-display mt-4 text-lg text-foreground">{c.title}</p>
                <div className="mt-4 flex items-center justify-between border-t border-border pt-3.5">
                  <p className="text-sm text-muted">{c.duration_weeks} weeks</p>
                  <span className="flex items-center gap-1 text-sm font-medium text-ink-900 opacity-0 transition-opacity group-hover:opacity-100">
                    Manage <ArrowRight size={14} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
