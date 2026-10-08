"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuthLinkSession } from "@/lib/use-auth-link-session";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { ROLE_HOME, type UserRole } from "@/lib/types";

export function AcceptInviteForm() {
  const router = useRouter();
  const { linkState, detail } = useAuthLinkSession();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    const password = String(formData.get("password") ?? "");
    const confirm = String(formData.get("confirm") ?? "");

    if (password.length < 8) return setError("Use at least 8 characters.");
    if (password !== confirm) return setError("Passwords don't match.");

    startTransition(async () => {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) return setError(updateError.message);

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return setError("Something went wrong. Please try signing in instead.");

      const { data: memberships } = await supabase.from("organization_members").select("organization_id").eq("user_id", userData.user.id);
      if (memberships && memberships.length > 0) {
        router.push("/organizations");
      } else {
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", userData.user.id).single();
        const role = (profile?.role ?? "student") as UserRole;
        router.push(ROLE_HOME[role]);
      }
      router.refresh();
    });
  }

  if (linkState === "checking") {
    return <p className="text-sm text-muted">Checking your invite link…</p>;
  }

  if (linkState === "invalid") {
    return (
      <div className="space-y-1">
        <p className="text-sm text-danger">
          This invite link is invalid or has expired. Ask your admin to resend it.
        </p>
        {detail && <p className="text-xs text-muted">Details: {detail}</p>}
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <Field label="New password" htmlFor="password">
        <Input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
      </Field>
      <Field label="Confirm password" htmlFor="confirm">
        <Input id="confirm" name="confirm" type="password" required minLength={8} autoComplete="new-password" />
      </Field>

      {error && <p className="text-sm text-danger">{error}</p>}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Saving…" : "Set password and continue"}
      </Button>
    </form>
  );
}
