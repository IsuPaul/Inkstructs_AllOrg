import { ClipboardList } from "lucide-react";
import { TopBar } from "@/components/shell/topbar";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatGrade } from "@/lib/grading";

export default async function AssignmentsPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: submissions } = await supabase
    .from("submissions")
    .select("id, status, grade, feedback, created_at, link_url, lessons(title, grading_type, grading_unit, max_score)")
    .eq("student_id", profile.id)
    .order("created_at", { ascending: false });

  return (
    <>
      <TopBar title="Assignments" />
      <div className="p-5 sm:p-8">
        {!submissions || submissions.length === 0 ? (
          <EmptyState icon={ClipboardList} title="No submissions yet" description="Assignments you submit from a lesson will show up here." />
        ) : (
          <div className="space-y-3">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {submissions.map((s: any) => {
              const formatted = formatGrade(s.grade, s.lessons?.grading_type ?? null, s.lessons?.grading_unit ?? null, s.lessons?.max_score ?? null);
              return (
                <div key={s.id} className="rounded-[var(--radius-md)] border border-border bg-surface p-4 shadow-[var(--shadow-xs)]">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">{s.lessons?.title}</p>
                    <StatusBadge tone={s.status === "graded" ? "success" : "amber"}>{s.status}</StatusBadge>
                  </div>
                  {s.link_url && (
                    <a
                      href={s.link_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-block text-sm text-ink-900 underline underline-offset-2"
                    >
                      View your submitted link
                    </a>
                  )}
                  {s.status === "graded" && (
                    <p className="mt-2 text-sm text-foreground">
                      Grade: <span className="font-medium">{formatted}</span>
                      {s.feedback && <span className="text-muted"> — {s.feedback}</span>}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
