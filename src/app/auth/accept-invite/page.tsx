import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { AcceptInviteForm } from "./accept-invite-form";
import { deploymentConfig } from "@/lib/deployment-config";

export default function AcceptInvitePage() {
  return (
    <AuthShell title={`Welcome to ${deploymentConfig.name}`} subtitle="Create your password to finish setting up your account.">
      <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
        <AcceptInviteForm />
      </Suspense>
    </AuthShell>
  );
}
