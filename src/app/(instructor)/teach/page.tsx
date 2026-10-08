import Link from "next/link";
import { Users2, ArrowRight } from "lucide-react";
import { TopBar } from "@/components/shell/topbar";
import { EmptyState } from "@/components/ui/empty-state";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";

export default async function TeachPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: assignments } = await supabase
    .from("cohort_instructors")
    .select("role, cohort_courses(id, courses(title), cohorts(name, start_date))")
    .eq("instructor_id", profile.id);

  return (
    <>
      <TopBar title="My cohorts" />
      <div className="p-5 sm:p-8">
        {!assignments || assignments.length === 0 ? (
          <EmptyState
            icon={Users2}
            title="No cohorts yet"
            description="Once an admin assigns you to a course within a cohort, it'll show up here."
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {assignments.map((a: any) => (
              <Link
                key={a.cohort_courses.id}
                href={`/teach/cohorts/${a.cohort_courses.id}`}
                className="group relative overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface p-5 shadow-[var(--shadow-xs)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]"
              >
                <div className="h-1 w-10 rounded-full bg-accent transition-all group-hover:w-16" />
                <p className="mt-4 text-xs font-medium capitalize text-muted">{a.role} instructor</p>
                <p className="mt-1 text-lg font-bold text-foreground">{a.cohort_courses.courses?.title}</p>
                <div className="mt-4 flex items-center justify-between border-t border-border pt-3.5">
                  <p className="text-sm text-muted">
                    {a.cohort_courses.cohorts?.name} · starts {a.cohort_courses.cohorts?.start_date}
                  </p>
                  <ArrowRight size={15} className="shrink-0 text-ink-300 transition-colors group-hover:text-ink-900" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
