import { Wallet } from "lucide-react";
import { TopBar } from "@/components/shell/topbar";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { createClient } from "@/lib/supabase/server";

export default async function AdminPaymentsPage() {
  const supabase = await createClient();
  const { data: payments } = await supabase
    .from("payments")
    .select("id, amount_kobo, status, provider, paid_at, created_at, enrollments(profiles(full_name), cohort_courses(cohorts(name)))")
    .order("created_at", { ascending: false });

  return (
    <>
      <TopBar title="Payments" />
      <div className="p-5 sm:p-8">
        {!payments || payments.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No payments yet"
            description="This fills in once Paystack checkout is wired up in Phase 3."
          />
        ) : (
          <div className="overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface shadow-[var(--shadow-xs)]">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-paper-50 text-left text-xs font-medium uppercase tracking-wide text-muted">
                    <th className="px-5 py-3 font-medium">Student</th>
                    <th className="px-5 py-3 font-medium">Cohort</th>
                    <th className="px-5 py-3 text-right font-medium">Amount</th>
                    <th className="px-5 py-3 font-medium">Provider</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {payments.map((p: any) => (
                    <tr key={p.id} className="transition-colors hover:bg-paper-100/50">
                      <td className="px-5 py-3.5 font-medium text-foreground">{p.enrollments?.profiles?.full_name}</td>
                      <td className="px-5 py-3.5 text-muted">{p.enrollments?.cohort_courses?.cohorts?.name}</td>
                      <td className="tabular-nums px-5 py-3.5 text-right font-medium text-foreground">
                        ₦{(p.amount_kobo / 100).toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5 capitalize text-muted">{p.provider}</td>
                      <td className="px-5 py-3.5">
                        <StatusBadge dot tone={p.status === "paid" ? "success" : "amber"}>
                          {p.status}
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
