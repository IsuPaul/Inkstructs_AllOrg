import Link from "next/link";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className="flex min-h-dvh">
      <div className="relative hidden w-[42%] flex-col justify-between overflow-hidden bg-ink-950 p-10 lg:flex">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-[0.15] blur-3xl"
          style={{ background: "radial-gradient(circle, var(--amber-500), transparent 70%)" }}
        />
        <div
          className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full opacity-[0.10] blur-3xl"
          style={{ background: "radial-gradient(circle, var(--teal-500), transparent 70%)" }}
        />

        <Link href="/" className="relative z-10 flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-accent font-display text-base font-semibold text-ink-950">
            I
          </span>
          <span className="font-display text-xl text-paper-50">Inkstructs</span>
        </Link>

        <div className="relative z-10">
          <p className="font-display text-3xl leading-tight text-paper-50">
            Instructor-led training, one week at a time.
          </p>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-300">
            Website development, AI &amp; automation, and Python programming — with a clear weekly path
            to a certificate.
          </p>
        </div>

        <p className="relative z-10 text-xs text-ink-500">© {new Date().getFullYear()} Inkstructs</p>
      </div>

      <div className="flex flex-1 items-center justify-center bg-background px-4 py-16 sm:px-8">
        <div className="w-full max-w-sm">
          <Link href="/" className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="flex h-7 w-7 items-center justify-center rounded-[7px] bg-ink-900 font-display text-sm font-semibold text-paper-50">
              I
            </span>
            <span className="font-display text-lg text-foreground">Inkstructs</span>
          </Link>

          <h1 className="font-display text-2xl text-foreground">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-muted">{subtitle}</p>}

          <div className="mt-7">{children}</div>

          {footer && <div className="mt-6 text-sm text-muted">{footer}</div>}
        </div>
      </div>
    </main>
  );
}
