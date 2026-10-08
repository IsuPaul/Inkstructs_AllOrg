"use client";

import { useActionState } from "react";
import { inviteInstructor } from "@/actions/admin-instructors";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

export function InviteInstructorForm() {
  const [state, formAction, pending] = useActionState(inviteInstructor, undefined);

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <Field label="Full name" htmlFor="full_name">
        <Input id="full_name" name="full_name" required />
      </Field>
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" required />
      </Field>
      {state?.error && <p className="text-sm text-danger sm:col-span-2">{state.error}</p>}
      {state?.success && <p className="text-sm text-success sm:col-span-2">Invite sent.</p>}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Sending…" : "Send invite"}
        </Button>
      </div>
    </form>
  );
}
