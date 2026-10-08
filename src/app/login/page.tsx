import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <AuthShell
      title="Sign in"
      subtitle="Use the email and password from your invite."
      footer={
        <>
          Applying for a course?{" "}
          <a href="/apply" className="text-ink-900 underline underline-offset-2">
            Apply here
          </a>
          .
        </>
      }
    >
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
