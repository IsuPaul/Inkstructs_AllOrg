import { Award } from "lucide-react";
import { TopBar } from "@/components/shell/topbar";
import { EmptyState } from "@/components/ui/empty-state";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";

export default async function CertificatesPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: certificates } = await supabase
    .from("certificates")
    .select("id, verification_code, issued_at, courses(title)")
    .eq("student_id", profile.id)
    .is("revoked_at", null);

  return (
    <>
      <TopBar title="Certificates" />
      <div className="p-5 sm:p-8">
        {!certificates || certificates.length === 0 ? (
          <EmptyState icon={Award} title="No certificates yet" description="Complete a course to earn one." />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {certificates.map((c: any) => (
              <div
                key={c.id}
                className="relative overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface p-6 shadow-[var(--shadow-xs)]"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/15 text-amber-600">
                  <Award size={20} strokeWidth={1.75} />
                </div>
                <p className="font-display mt-4 text-lg text-foreground">{c.courses?.title}</p>
                <p className="mt-1.5 font-mono text-xs text-muted">Code: {c.verification_code}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
