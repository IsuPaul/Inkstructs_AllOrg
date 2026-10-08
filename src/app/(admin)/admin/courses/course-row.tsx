"use client";

import { useTransition } from "react";
import Link from "next/link";
import { setCoursePublished } from "@/actions/admin-content";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";

export function CourseRow({
  id,
  title,
  durationWeeks,
  daysPerWeek,
  isPublished,
}: {
  id: string;
  title: string;
  durationWeeks: number;
  daysPerWeek: number;
  isPublished: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-between rounded-[10px] border-b border-border px-1 py-4 transition-colors last:border-0 hover:bg-paper-100/50">
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted">
          {durationWeeks} weeks · {daysPerWeek} days/week
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Link href={`/admin/courses/${id}/builder`} className="text-sm text-ink-900 underline underline-offset-2">
          Manage content
        </Link>
        <StatusBadge tone={isPublished ? "success" : "neutral"}>
          {isPublished ? "Published" : "Draft"}
        </StatusBadge>
        <Button
          variant="secondary"
          disabled={pending}
          onClick={() => startTransition(async () => { await setCoursePublished(id, !isPublished); })}
        >
          {pending ? "Saving…" : isPublished ? "Unpublish" : "Publish"}
        </Button>
      </div>
    </div>
  );
}
