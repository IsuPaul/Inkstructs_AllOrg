"use client";

import { useActionState } from "react";
import { submitApplication } from "@/actions/applications";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

type Course = { id: string; title: string };

export function ApplyForm({ courses }: { courses: Course[] }) {
  const [state, formAction, pending] = useActionState(submitApplication, undefined);

  if (state?.success) {
    return (
      <div className="rounded-[var(--radius-md)] border border-border bg-surface p-6">
        <p className="font-display text-lg text-foreground">Application received</p>
        <p className="mt-2 text-sm text-muted">
          We&apos;ll review it and email you if you&apos;re accepted, with a link to pay and set up your account.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <Field label="Full name" htmlFor="full_name">
        <Input id="full_name" name="full_name" required />
      </Field>
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" required />
      </Field>
      <Field label="Phone (WhatsApp preferred)" htmlFor="phone">
        <Input id="phone" name="phone" type="tel" />
      </Field>
      <Field label="Course" htmlFor="course_id">
        <select
          id="course_id"
          name="course_id"
          required
          className="w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-2.5 text-sm text-foreground"
        >
          <option value="">Choose a course</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Anything you'd like us to know? (optional)" htmlFor="message">
        <textarea
          id="message"
          name="message"
          rows={3}
          className="w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-2.5 text-sm text-foreground"
        />
      </Field>

      {state?.error && <p className="text-sm text-danger">{state.error}</p>}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Sending…" : "Submit application"}
      </Button>
    </form>
  );
}
