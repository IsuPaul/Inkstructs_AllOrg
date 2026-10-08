"use client";

import { useTransition } from "react";
import { Check } from "lucide-react";
import { markLessonComplete, markLessonIncomplete } from "@/actions/progress";
import { cn } from "@/lib/utils";

export function LessonCompleteToggle({
  lessonId,
  moduleId,
  courseSlug,
  completed,
}: {
  lessonId: string;
  moduleId: string;
  courseSlug: string;
  completed: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      onClick={() =>
        startTransition(async () => {
          if (completed) await markLessonIncomplete(lessonId, courseSlug, moduleId);
          else await markLessonComplete(lessonId, courseSlug, moduleId);
        })
      }
      disabled={pending}
      className={cn(
        "flex items-center gap-2 rounded-[var(--radius-sm)] px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50",
        completed ? "bg-success/12 text-success" : "bg-ink-900 text-paper-50 hover:bg-ink-700"
      )}
    >
      <Check size={16} strokeWidth={2.25} />
      {completed ? "Marked complete" : pending ? "Saving…" : "Mark as complete"}
    </button>
  );
}
