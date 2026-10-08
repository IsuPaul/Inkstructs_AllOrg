"use client";

import { useActionState } from "react";
import { createCohort } from "@/actions/admin-content";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

export function NewCohortForm() {
  const [state, formAction, pending] = useActionState(createCohort, undefined);

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <Field label="Cohort name" htmlFor="name">
        <Input id="name" name="name" required placeholder="Nov 2026 Intake" />
      </Field>
      <Field label="Start date" htmlFor="start_date">
        <Input id="start_date" name="start_date" type="date" required />
      </Field>
      {state?.error && <p className="text-sm text-danger sm:col-span-2">{state.error}</p>}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create cohort"}
        </Button>
        <p className="mt-2 text-xs text-muted">Add courses to it from the cohort&apos;s page once it&apos;s created.</p>
      </div>
    </form>
  );
}
