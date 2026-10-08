import { TopBar } from "@/components/shell/topbar";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ClipboardList } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatGrade } from "@/lib/grading";
import { GradeForm } from "./grade-form";

export default async function InstructorSubmissionsPage() {
  const supabase = await createClient();
  const { data: submissions } = await supabase
    .from("submissions")
    .select(
      "id, status, grade, feedback, text_answer, file_url, link_url, created_at, profiles!student_id(full_name), lessons(title, grading_type, grading_unit, max_score)"
    )
    .order("created_at", { ascending: true });

  const fileUrls = new Map<string, string>();
  for (const s of submissions ?? []) {
    if (s.file_url) {
      const { data } = await supabase.storage.from("submissions").createSignedUrl(s.file_url, 60 * 60);
      if (data?.signedUrl) fileUrls.set(s.id, data.signedUrl);
    }
  }

  return (
    <>
      <TopBar title="Submissions" />
      <div className="p-5 sm:p-8">
        {!submissions || submissions.length === 0 ? (
          <EmptyState icon={ClipboardList} title="Nothing submitted yet" description="Student assignment submissions will show up here." />
        ) : (
          <div className="rounded-[var(--radius-md)] border border-border bg-surface px-5 shadow-[var(--shadow-xs)]">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {submissions.map((s: any) => {
              const formatted = formatGrade(s.grade, s.lessons?.grading_type ?? null, s.lessons?.grading_unit ?? null, s.lessons?.max_score ?? null);
              return (
                <div key={s.id} className="rounded-[10px] border-b border-border px-1 py-4 transition-colors last:border-0 hover:bg-paper-100/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{s.profiles?.full_name}</p>
                      <p className="text-xs text-muted">{s.lessons?.title}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {formatted && <span className="text-sm font-medium text-foreground">{formatted}</span>}
                      <StatusBadge tone={s.status === "graded" ? "success" : "amber"}>{s.status}</StatusBadge>
                    </div>
                  </div>

                  {s.text_answer && <p className="mt-2 text-sm text-foreground">{s.text_answer}</p>}
                  <div className="mt-1 flex gap-3">
                    {fileUrls.get(s.id) && (
                      <a
                        href={fileUrls.get(s.id)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block text-sm text-ink-900 underline underline-offset-2"
                      >
                        View attached file
                      </a>
                    )}
                    {s.link_url && (
                      <a
                        href={s.link_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block text-sm text-ink-900 underline underline-offset-2"
                      >
                        Open submitted link
                      </a>
                    )}
                  </div>

                  <GradeForm
                    submissionId={s.id}
                    gradingType={s.lessons?.grading_type ?? null}
                    gradingUnit={s.lessons?.grading_unit ?? null}
                    maxScore={s.lessons?.max_score ?? null}
                    currentGrade={s.grade}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
