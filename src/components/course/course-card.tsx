import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { WeekLedger } from "./week-ledger";

export function CourseCard({
  slug,
  title,
  cohortName,
  totalWeeks,
  completedWeeks,
  currentWeek,
  nextLessonTitle,
  resumeModuleId,
  percent,
}: {
  slug: string;
  title: string;
  cohortName: string;
  totalWeeks: number;
  completedWeeks: number;
  currentWeek?: number;
  nextLessonTitle?: string;
  /** If set, opening the card jumps straight back to this module instead of the week roadmap. */
  resumeModuleId?: string;
  /** Completed-lessons-weighted-by-built-weeks percentage — see course_progress view. */
  percent: number;
}) {
  const href = resumeModuleId ? `/courses/${slug}/modules/${resumeModuleId}` : `/courses/${slug}`;

  return (
    <Link
      href={href}
      className="group relative block overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface p-5 shadow-[var(--shadow-xs)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]"
    >
      <div className="h-1 w-10 rounded-full bg-accent transition-all group-hover:w-16" />

      <div className="mt-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-muted">{cohortName}</p>
          <h3 className="font-display mt-1 text-xl leading-snug text-foreground">{title}</h3>
        </div>
        <p className="font-display tabular-nums shrink-0 text-2xl leading-none text-foreground">{percent}%</p>
      </div>

      <div className="mt-5">
        <div className="flex items-baseline justify-between text-xs text-muted">
          <span>
            Week {Math.min(completedWeeks + 1, totalWeeks)} of {totalWeeks}
          </span>
        </div>
        <WeekLedger
          totalWeeks={totalWeeks}
          completedWeeks={completedWeeks}
          currentWeek={currentWeek}
          className="mt-2"
        />
      </div>

      {nextLessonTitle && (
        <div className="mt-4 flex items-center justify-between border-t border-border pt-3.5">
          <p className="truncate text-sm text-foreground">
            <span className="text-muted">Continue: </span>
            {nextLessonTitle}
          </p>
          <ArrowRight size={15} className="shrink-0 text-muted transition-colors group-hover:text-ink-900" />
        </div>
      )}
    </Link>
  );
}
