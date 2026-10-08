import Link from "next/link";

export default function AccountDeactivatedPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm text-center">
        <p className="font-display text-2xl text-foreground">Inkstructs</p>
        <h1 className="mt-6 text-lg font-medium text-foreground">This account has been deactivated</h1>
        <p className="mt-2 text-sm text-muted">
          If you think this is a mistake, contact your Inkstructs admin to have your access restored.
        </p>
        <Link href="/login" className="mt-6 inline-block text-sm text-ink-900 underline underline-offset-2">
          Back to sign in
        </Link>
      </div>
    </main>
  );
}
