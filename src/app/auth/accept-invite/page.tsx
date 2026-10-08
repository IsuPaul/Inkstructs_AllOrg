import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { AcceptInviteForm } from "./accept-invite-form";

export default function AcceptInvitePage() {
  return (
    <AuthShell title="Welcome to Inkstructs" subtitle="Set a password to finish creating your account.">
      <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
        <AcceptInviteForm />
      </Suspense>
    </AuthShell>
  );
}
