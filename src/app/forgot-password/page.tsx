import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "./forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Reset your password"
      subtitle="We'll email you a link to set a new one."
      footer={
        <a href="/login" className="text-ink-900 underline underline-offset-2">
          Back to sign in
        </a>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
