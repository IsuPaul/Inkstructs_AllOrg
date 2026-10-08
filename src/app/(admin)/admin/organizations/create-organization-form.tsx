"use client";

import { useActionState } from "react";
import { createOrganization } from "@/actions/organizations";

export function CreateOrganizationForm() {
  const [state, action, pending] = useActionState(createOrganization, undefined);
  return <form action={action} className="rounded-[var(--radius-md)] border border-border bg-surface p-5 shadow-[var(--shadow-xs)]"><h2 className="font-display text-lg text-foreground">Add organization</h2><label className="mt-5 block text-sm text-foreground">Name<input name="name" required placeholder="Example Academy" className="mt-2 w-full rounded-[var(--radius-sm)] border bg-background px-3 py-2 text-sm" /></label><label className="mt-4 block text-sm text-foreground">Slug<input name="slug" required placeholder="example-academy" className="mt-2 w-full rounded-[var(--radius-sm)] border bg-background px-3 py-2 text-sm" /></label><label className="mt-4 block text-sm text-foreground">Brand color<input name="primary_color" type="color" defaultValue="#e8a33d" className="mt-2 block h-10 w-16 rounded border bg-background p-1" /></label>{state?.error && <p className="mt-4 text-sm text-danger">{state.error}</p>}{state?.success && <p className="mt-4 text-sm text-success">Organization created.</p>}<button className="mt-6 rounded-[var(--radius-sm)] bg-accent px-4 py-2 text-sm font-medium text-ink-950 disabled:opacity-60" type="submit" disabled={pending}>{pending ? "Creating…" : "Create organization"}</button></form>;
}
