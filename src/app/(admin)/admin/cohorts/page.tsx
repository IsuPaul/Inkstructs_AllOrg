import Link from "next/link";
import { Users2, ChevronRight } from "lucide-react";
import { TopBar } from "@/components/shell/topbar";
import { StatusBadge } from "@/components/ui/status-badge";
import { createClient } from "@/lib/supabase/server";
import { NewCohortForm } from "./new-cohort-form";

export default async function AdminCohortsPage() {
  const supabase = await createClient();
  const { data: cohorts } = await supabase
    .from("cohorts")
    .select("id, name, start_date, status, cohort_courses(courses(title))")
    .order("start_date", { ascending: false });

  return (
    <>
      <TopBar title="Cohorts" />
      <div className="space-y-6 p-5 sm:p-8">
        <div className="rounded-[var(--radius-md)] border border-border bg-surface p-6 shadow-[var(--shadow-xs)] sm:p-7">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-accent/15 text-amber-600">
              <Users2 size={17} strokeWidth={1.75} />
            </span>
            <div>
              <h2 className="text-lg font-bold leading-tight text-foreground">New cohort</h2>
              <p className="text-sm text-muted">An intake or batch — add one or more courses to it next.</p>
            </div>
          </div>
          <div className="mt-5">
            <NewCohortForm />
          </div>
        </div>

        <div className="rounded-[var(--radius-md)] border border-border bg-surface px-5 shadow-[var(--shadow-xs)]">
          {!cohorts || cohorts.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">No cohorts yet.</p>
          ) : (
            /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
            cohorts.map((c: any) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const courseTitles = (c.cohort_courses ?? []).map((cc: any) => cc.courses?.title).filter(Boolean);
              return (
                <Link
                  key={c.id}
                  href={`/admin/cohorts/${c.id}`}
                  className="group flex items-center justify-between gap-3 rounded-[10px] border-b border-border px-1 py-4 transition-colors last:border-0 hover:bg-paper-100/60"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{c.name}</p>
                    <p className="truncate text-xs text-muted">
                      Starts {c.start_date} ·{" "}
                      {courseTitles.length > 0 ? courseTitles.join(", ") : "No courses added yet"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <StatusBadge dot tone={c.status === "running" ? "success" : "neutral"}>
                      {c.status}
                    </StatusBadge>
                    <ChevronRight size={16} className="text-ink-300 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
