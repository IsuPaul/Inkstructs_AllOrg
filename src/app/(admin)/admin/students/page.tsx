import { GraduationCap } from "lucide-react";
import { TopBar } from "@/components/shell/topbar";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ActiveToggle } from "@/components/admin/active-toggle";
import { createClient } from "@/lib/supabase/server";

export default async function AdminStudentsPage() {
  const supabase = await createClient();
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("id, status, profiles(id, full_name, email, is_active), cohort_courses(courses(title), cohorts(name))")
    .order("created_at", { ascending: false });

  return (
    <>
      <TopBar title="Students" />
      <div className="p-5 sm:p-8">
        {!enrollments || enrollments.length === 0 ? (
          <EmptyState icon={GraduationCap} title="No students enrolled yet" description="Accepted applications and direct invites will show up here." />
        ) : (
          <div className="overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface shadow-[var(--shadow-xs)]">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-paper-50 text-left text-xs font-medium uppercase tracking-wide text-muted">
                    <th className="px-5 py-3 font-medium">Student</th>
                    <th className="px-5 py-3 font-medium">Course</th>
                    <th className="px-5 py-3 font-medium">Enrollment</th>
                    <th className="px-5 py-3 text-right font-medium">Account</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {enrollments.map((e: any) => (
                    <tr key={e.id} className="transition-colors hover:bg-paper-100/50">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground">{e.profiles?.full_name}</p>
                          {e.profiles && !e.profiles.is_active && (
                            <StatusBadge tone="danger" dot>
                              Deactivated
                            </StatusBadge>
                          )}
                        </div>
                        <p className="text-xs text-muted">{e.profiles?.email}</p>
                      </td>
                      <td className="px-5 py-3.5 text-muted">
                        {e.cohort_courses?.courses?.title}
                        <span className="text-xs"> · {e.cohort_courses?.cohorts?.name}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge dot tone={e.status === "active" ? "success" : e.status === "pending_payment" ? "amber" : "neutral"}>
                          {e.status.replace("_", " ")}
                        </StatusBadge>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {e.profiles && <ActiveToggle userId={e.profiles.id} isActive={e.profiles.is_active} />}
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
