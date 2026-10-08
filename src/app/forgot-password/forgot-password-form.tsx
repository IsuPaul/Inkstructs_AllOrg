"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    const email = String(formData.get("email") ?? "").trim();
    if (!email) return setError("Enter your email.");

    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      // Always show success, even on error — this avoids confirming or
      // denying whether an email address has an Inkstructs account.
      if (error) console.error(error);
      setSent(true);
    });
  }

  if (sent) {
    return (
      <div className="rounded-[var(--radius-md)] border border-border bg-surface p-5">
        <p className="text-sm text-foreground">Check your email</p>
        <p className="mt-1 text-sm text-muted">
          If that address has an Inkstructs account, a reset link is on its way.
        </p>
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </Field>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}
