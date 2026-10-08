"use client";

import { useActionState } from "react";
import { postAnnouncement } from "@/actions/announcements";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

export function AnnouncementForm({ cohortCourseId }: { cohortCourseId: string }) {
  const [state, formAction, pending] = useActionState(postAnnouncement, undefined);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="cohort_course_id" value={cohortCourseId} />
      <Field label="Title" htmlFor="a_title">
        <Input id="a_title" name="title" required placeholder="Class moved to Thursday" />
      </Field>
      <Field label="Message" htmlFor="a_body">
        <textarea
          id="a_body"
          name="body"
          rows={3}
          required
          className="w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-2 text-sm text-foreground"
        />
      </Field>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Posting…" : "Post announcement"}
      </Button>
    </form>
  );
}
