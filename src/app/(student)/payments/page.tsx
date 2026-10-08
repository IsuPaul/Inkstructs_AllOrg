import { TopBar } from "@/components/shell/topbar";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { StatusBadge } from "@/components/ui/status-badge";

export default async function PaymentsPage() {
  await requireProfile();
  const supabase = await createClient();

  const { data: payments } = await supabase
    .from("payments")
    .select("id, amount_kobo, currency, status, paid_at, enrollments(cohort_courses(cohorts(name), courses(title)))")
    .order("created_at", { ascending: false });

  return (
    <>
      <TopBar title="Payments" />
      <div className="p-5 sm:p-8">
        {!payments || payments.length === 0 ? (
          <p className="text-sm text-muted">No payments on record yet.</p>
        ) : (
          <div className="space-y-3">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {payments.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between rounded-[var(--radius-md)] border border-border bg-surface p-4">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {p.enrollments?.cohort_courses?.courses?.title}
                  </p>
                  <p className="text-xs text-muted">
                    ₦{(p.amount_kobo / 100).toLocaleString()} · {p.enrollments?.cohort_courses?.cohorts?.name}
                  </p>
                </div>
                <StatusBadge tone={p.status === "paid" ? "success" : "amber"}>{p.status}</StatusBadge>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
