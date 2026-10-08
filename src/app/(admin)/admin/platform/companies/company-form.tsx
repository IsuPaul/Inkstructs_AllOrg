"use client";

import { useActionState } from "react";
import { createPlatformCompany } from "@/actions/platform-companies";

export function CompanyForm() {
  const [state, action, pending] = useActionState(createPlatformCompany, undefined);
  return <form action={action} className="grid gap-4 rounded-[var(--radius-md)] border border-border bg-surface p-5"><h2 className="font-display text-lg text-foreground">Create company</h2><label className="text-sm text-foreground">Company name<input name="name" required placeholder="Example Academy" className="mt-2 w-full rounded border bg-background px-3 py-2 text-sm" /></label><label className="text-sm text-foreground">Slug<input name="slug" required placeholder="example-academy" className="mt-2 w-full rounded border bg-background px-3 py-2 text-sm" /></label><label className="text-sm text-foreground">Administrator email<input name="admin_email" type="email" required placeholder="admin@example.com" className="mt-2 w-full rounded border bg-background px-3 py-2 text-sm" /></label><label className="text-sm text-foreground">Subscription plan<select name="subscription_plan" className="mt-2 w-full rounded border bg-background px-3 py-2 text-sm"><option value="starter">Starter</option><option value="growth">Growth</option><option value="enterprise">Enterprise</option></select></label>{state?.error && <p className="text-sm text-danger">{state.error}</p>}{state?.success && <p className="text-sm text-success">Company queued for provisioning.</p>}<button disabled={pending} className="rounded bg-accent px-4 py-2 text-sm font-medium text-ink-950 disabled:opacity-60">{pending ? "Creating…" : "Create company"}</button></form>;
}
