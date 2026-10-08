"use client";

import { useState, useTransition } from "react";
import { acceptApplication, rejectApplication } from "@/actions/admin-applications";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";

type Cohort = { id: string; name: string };

export function ApplicationRow({
  id,
  fullName,
  email,
  courseTitle,
  status,
  cohorts,
}: {
  id: string;
  fullName: string;
  email: string;
  courseTitle: string;
  status: string;
  cohorts: Cohort[];
}) {
  const [cohortCourseId, setCohortCourseId] = useState(cohorts[0]?.id ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3 rounded-[10px] border-b border-border px-1 py-4 transition-colors last:border-0 hover:bg-paper-100/50 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium text-foreground">{fullName}</p>
        <p className="text-xs text-muted">
          {email} · {courseTitle}
        </p>
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      </div>

      {status === "pending" ? (
        <div className="flex items-center gap-2">
          <select
            value={cohortCourseId}
            onChange={(e) => setCohortCourseId(e.target.value)}
            className="rounded-[var(--radius-sm)] border border-border bg-surface px-2 py-2 text-xs text-foreground"
          >
            {cohorts.length === 0 && <option value="">No open cohort offers this course</option>}
            {cohorts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await rejectApplication(id);
                if (res?.error) setError(res.error);
              })
            }
          >
            Reject
          </Button>
          <Button
            disabled={pending || !cohortCourseId}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                const res = await acceptApplication(id, cohortCourseId);
                if (res?.error) setError(res.error);
              })
            }
          >
            {pending ? "Working…" : "Accept & invite"}
          </Button>
        </div>
      ) : (
        <StatusBadge tone={status === "accepted" || status === "enrolled" ? "success" : "neutral"}>
          {status}
        </StatusBadge>
      )}
    </div>
  );
}
