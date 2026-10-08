"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { updateCourseDuration } from "@/actions/admin-content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function DurationControl({ courseId, currentWeeks }: { courseId: string; currentWeeks: number }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [weeks, setWeeks] = useState(String(currentWeeks));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink-900"
      >
        {currentWeeks} weeks <Pencil size={12} className="opacity-50" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        min={1}
        value={weeks}
        onChange={(e) => setWeeks(e.target.value)}
        className="w-20 py-1.5 text-sm"
      />
      <Button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const res = await updateCourseDuration(courseId, Number(weeks));
            if (res.error) setError(res.error);
            else {
              setEditing(false);
              router.refresh();
            }
          })
        }
        className="px-3 py-1.5 text-xs"
      >
        {pending ? "Saving…" : "Save"}
      </Button>
      <Button variant="secondary" onClick={() => setEditing(false)} className="px-3 py-1.5 text-xs">
        Cancel
      </Button>
      {error && <p className="w-full text-xs text-danger">{error}</p>}
    </div>
  );
}
