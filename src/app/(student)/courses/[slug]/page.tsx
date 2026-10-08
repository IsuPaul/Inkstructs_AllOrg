import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Circle, CircleDashed, ListChecks, ChevronRight, PlayCircle, Lock } from "lucide-react";
import { TopBar } from "@/components/shell/topbar";
import { WeekLedger } from "@/components/course/week-ledger";
import { StatusBadge } from "@/components/ui/status-badge";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";

const MODULE_STATUS = {
  complete: { icon: CheckCircle2, className: "text-success", label: "Complete" },
  in_progress: { icon: CircleDashed, className: "text-amber-600", label: "In progress" },
  not_started: { icon: Circle, className: "text-ink-300", label: "Not started" },
} as const;

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: course } = await supabase
    .from("courses")
    .select("id, title, description, duration_weeks")
    .eq("slug", slug)
    .single();

  if (!course) notFound();

  // moduleProgress, the resume pointer, and the course percent only need
  // profile.id (already known), so they don't need to wait on the weeks
  // query — run everything together.
  const [{ data: weeks }, { data: moduleProgress }, { data: resume }, { data: progressRow }] = await Promise.all([
    supabase
      .from("weeks")
      .select(
        "id, week_number, title, summary, modules(id, day_number, title, is_required, available_at), quizzes(id, title)"
      )
      .eq("course_id", course.id)
      .order("week_number"),
    supabase.from("module_progress").select("module_id, status").eq("student_id", profile.id),
    supabase
      .from("last_viewed_module")
      .select("module_id, modules(title)")
      .eq("student_id", profile.id)
      .eq("course_id", course.id)
      .maybeSingle(),
    // The real course percentage — see course_progress view: completed
    // lessons weighted by how many weeks actually have content yet.
    supabase
      .from("course_progress")
      .select("percent_complete")
      .eq("student_id", profile.id)
      .eq("course_id", course.id)
      .maybeSingle(),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resumeModule = resume as any;

  const statusByModule = new Map((moduleProgress ?? []).map((m) => [m.module_id, m.status]));

  const completedWeeks =
    (weeks ?? []).filter((w) => {
      const requiredModules = (w.modules ?? []).filter((m) => m.is_required);
      // A week with no modules yet (instructor hasn't built it) is not
      // "complete" — .every() on an empty array is vacuously true, which
      // was the bug: unbuilt weeks were silently counting as done.
      return requiredModules.length > 0 && requiredModules.every((m) => statusByModule.get(m.id) === "complete");
    }).length ?? 0;

  const percent = progressRow?.percent_complete ?? 0;

  return (
    <>
      <TopBar title={course.title} subtitle={course.description ?? undefined} />
      <div className="p-5 sm:p-8">
        <div className="flex items-center gap-5 rounded-[var(--radius-md)] border border-border bg-surface p-5 shadow-[var(--shadow-xs)]">
          <p className="font-display tabular-nums shrink-0 text-3xl text-foreground">{percent}%</p>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-medium text-foreground">Course progress</span>
              <span className="text-muted">
                {completedWeeks} of {course.duration_weeks} weeks
              </span>
            </div>
            <WeekLedger totalWeeks={course.duration_weeks} completedWeeks={completedWeeks} className="mt-2.5" />
          </div>
        </div>

        {resumeModule?.module_id && (
          <Link
            href={`/courses/${slug}/modules/${resumeModule.module_id}`}
            className="group mt-4 flex items-center gap-3 rounded-[var(--radius-md)] border border-ink-900 bg-ink-900 p-4 text-paper-50 shadow-[var(--shadow-sm)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-ink-950">
              <PlayCircle size={20} strokeWidth={1.75} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-ink-300">Continue where you left off</p>
              <p className="truncate text-sm font-medium">{resumeModule.modules?.title}</p>
            </div>
            <ChevronRight size={18} className="shrink-0 transition-transform group-hover:translate-x-0.5" />
          </Link>
        )}

        <div className="mt-6 space-y-4">
          {(weeks ?? []).map((week) => {
            const requiredModules = (week.modules ?? []).filter((m) => m.is_required);
            const weekComplete =
              requiredModules.length > 0 &&
              requiredModules.every((m) => statusByModule.get(m.id) === "complete");
            const weekQuiz = (week as unknown as { quizzes: { id: string; title: string } | null }).quizzes;

            // The line under "Week N" previews the week's first module — its
            // title and when it opens — instead of repeating the week's own title.
            const sortedModules = [...(week.modules ?? [])].sort((a, b) => a.day_number - b.day_number);
            const firstModule = sortedModules[0];
            const firstAvailableAt = firstModule ? (firstModule as { available_at: string | null }).available_at : null;
            const firstDateLabel = !firstAvailableAt
              ? "Available now"
              : `${new Date(firstAvailableAt) > new Date() ? "Unlocks" : "Opened"} ${new Date(firstAvailableAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

            return (
              <section
                key={week.id}
                className={`overflow-hidden rounded-[var(--radius-md)] border bg-surface shadow-[var(--shadow-xs)] ${
                  weekComplete ? "border-success/25" : "border-border"
                }`}
              >
                <div className="flex items-center justify-between border-b border-border px-5 py-4">
                  <div>
                    <p className="text-xs font-medium text-muted">Week {week.week_number}</p>
                    {firstModule && (
                      <>
                        <h2 className="text-lg font-bold leading-tight text-foreground">{firstModule.title}</h2>
                        <p className="text-xs text-muted">
                          {firstDateLabel}
                          {sortedModules.length > 1 && ` · +${sortedModules.length - 1} more`}
                        </p>
                      </>
                    )}
                  </div>
                  <StatusBadge dot tone={weekComplete ? "success" : "neutral"}>
                    {weekComplete ? "Complete" : requiredModules.length === 0 ? "No content yet" : "In progress"}
                  </StatusBadge>
                </div>

                <ul className="divide-y divide-border">
                  {(week.modules ?? [])
                    .sort((a, b) => a.day_number - b.day_number)
                    .map((mod) => {
                      const status = statusByModule.get(mod.id) ?? "not_started";
                      const cfg = MODULE_STATUS[status as keyof typeof MODULE_STATUS] ?? MODULE_STATUS.not_started;
                      const Icon = cfg.icon;
                      const availableAt = (mod as { available_at: string | null }).available_at;
                      const locked = availableAt ? new Date(availableAt) > new Date() : false;

                      if (locked) {
                        return (
                          <li key={mod.id} className="flex items-center gap-3 px-5 py-3.5 opacity-60">
                            <Lock size={18} strokeWidth={1.75} className="shrink-0 text-ink-300" />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-muted">Day {mod.day_number}</p>
                              <p className="truncate text-sm text-foreground">{mod.title}</p>
                            </div>
                            <p className="shrink-0 text-xs text-muted">
                              Unlocks{" "}
                              {new Date(availableAt!).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </p>
                          </li>
                        );
                      }

                      return (
                        <li key={mod.id}>
                          <Link
                            href={`/courses/${slug}/modules/${mod.id}`}
                            className="group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-paper-100"
                          >
                            <Icon size={18} strokeWidth={1.75} className={`shrink-0 ${cfg.className}`} />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-muted">Day {mod.day_number}</p>
                              <p className="truncate text-sm text-foreground">{mod.title}</p>
                            </div>
                            <ChevronRight
                              size={16}
                              className="shrink-0 text-ink-300 transition-transform group-hover:translate-x-0.5"
                            />
                          </Link>
                        </li>
                      );
                    })}
                </ul>

                {weekQuiz && (
                  <Link
                    href={`/courses/${slug}/quizzes/${weekQuiz.id}`}
                    className="flex items-center gap-3 border-t border-border bg-amber-400/[0.06] px-5 py-3.5 transition-colors hover:bg-amber-400/[0.1]"
                  >
                    <ListChecks size={18} strokeWidth={1.75} className="shrink-0 text-amber-600" />
                    <p className="flex-1 text-sm text-foreground">Quiz: {weekQuiz.title}</p>
                    <ChevronRight size={16} className="shrink-0 text-amber-600" />
                  </Link>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </>
  );
}
