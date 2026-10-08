"use client";

import { useActionState } from "react";
import { createCourse } from "@/actions/admin-content";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

export function NewCourseForm() {
  const [state, formAction, pending] = useActionState(createCourse, undefined);

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <Field label="Course title" htmlFor="title">
        <Input id="title" name="title" required placeholder="Python Programming" />
      </Field>
      <Field label="Weeks" htmlFor="duration_weeks">
        <Input id="duration_weeks" name="duration_weeks" type="number" min={1} defaultValue={8} required />
      </Field>
      <Field label="Days per week" htmlFor="days_per_week">
        <Input id="days_per_week" name="days_per_week" type="number" min={1} max={7} defaultValue={3} required />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Short description" htmlFor="description">
          <textarea
            id="description"
            name="description"
            rows={2}
            className="w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-2.5 text-sm text-foreground"
          />
        </Field>
      </div>
      {state?.error && <p className="text-sm text-danger sm:col-span-2">{state.error}</p>}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create course"}
        </Button>
      </div>
    </form>
  );
}
