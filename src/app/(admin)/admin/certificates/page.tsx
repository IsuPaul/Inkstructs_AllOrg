import { Award } from "lucide-react";
import { TopBar } from "@/components/shell/topbar";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { createClient } from "@/lib/supabase/server";

export default async function AdminCertificatesPage() {
  const supabase = await createClient();
  const { data: certificates } = await supabase
    .from("certificates")
    .select("id, verification_code, issued_at, revoked_at, profiles!student_id(full_name), courses(title)")
    .order("issued_at", { ascending: false });

  return (
    <>
      <TopBar title="Certificates" />
      <div className="p-5 sm:p-8">
        {!certificates || certificates.length === 0 ? (
          <EmptyState
            icon={Award}
            title="No certificates issued yet"
            description="These generate automatically once a student completes a course (Phase 3)."
          />
        ) : (
          <div className="overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface shadow-[var(--shadow-xs)]">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-paper-50 text-left text-xs font-medium uppercase tracking-wide text-muted">
                    <th className="px-5 py-3 font-medium">Student</th>
                    <th className="px-5 py-3 font-medium">Course</th>
                    <th className="px-5 py-3 font-medium">Verification code</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {certificates.map((c: any) => (
                    <tr key={c.id} className="transition-colors hover:bg-paper-100/50">
                      <td className="px-5 py-3.5 font-medium text-foreground">{c.profiles?.full_name}</td>
                      <td className="px-5 py-3.5 text-muted">{c.courses?.title}</td>
                      <td className="px-5 py-3.5 font-mono text-xs text-muted">{c.verification_code}</td>
                      <td className="px-5 py-3.5">
                        <StatusBadge dot tone={c.revoked_at ? "danger" : "success"}>
                          {c.revoked_at ? "Revoked" : "Active"}
                        </StatusBadge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
