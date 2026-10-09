import Link from "next/link";
import { Inbox, GraduationCap, Wallet, BookOpen, ArrowRight, TrendingUp } from "lucide-react";
import { TopBar } from "@/components/shell/topbar";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { TrendChart } from "@/components/admin/trend-chart";
import { createClient } from "@/lib/supabase/server";
import { deploymentConfig } from "@/lib/deployment-config";

const WEEKS_BACK = 10;

function startOfWeek(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = (day + 6) % 7; // Monday as week start
  date.setDate(date.getDate() - diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export default async function AdminOverview() {
  const supabase = await createClient();

  const since = startOfWeek(new Date());
  since.setDate(since.getDate() - 7 * (WEEKS_BACK - 1));

  const [
    { count: pendingApps },
    { count: activeStudents },
    { data: payments },
    { count: publishedCourses },
    { data: recentApps },
    { data: recentEnrollments },
  ] = await Promise.all([
    supabase.from("applications").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("enrollments").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("payments").select("amount_kobo").eq("status", "paid"),
    supabase.from("courses").select("id", { count: "exact", head: true }).eq("is_published", true),
    supabase
      .from("applications")
      .select("id, full_name, status, created_at, courses(title)")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase.from("enrollments").select("created_at").gte("created_at", since.toISOString()),
  ]);

  const revenueKobo = (payments ?? []).reduce((sum, p) => sum + Number(p.amount_kobo ?? 0), 0);

  // Bucket enrollments into weekly counts for the trend chart.
  const buckets = Array.from({ length: WEEKS_BACK }, (_, i) => {
    const weekStart = new Date(since);
    weekStart.setDate(weekStart.getDate() + 7 * i);
    return { start: weekStart, value: 0 };
  });
  for (const e of recentEnrollments ?? []) {
    const created = new Date(e.created_at);
    for (let i = buckets.length - 1; i >= 0; i--) {
      if (created >= buckets[i].start) {
        buckets[i].value += 1;
        break;
      }
    }
  }
  const chartData = buckets.map((b) => ({
    label: b.start.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    value: b.value,
  }));

  return (
    <>
      <TopBar title="Overview" subtitle={`A snapshot of ${deploymentConfig.name} right now`} />
      <div className="p-5 sm:p-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Pending applications"
            value={pendingApps ?? 0}
            icon={Inbox}
            tone={pendingApps ? "accent" : "neutral"}
            hint={pendingApps ? "Needs your review" : "All caught up"}
          />
          <StatCard label="Active students" value={activeStudents ?? 0} icon={GraduationCap} />
          <StatCard label="Revenue collected" value={`₦${(revenueKobo / 100).toLocaleString()}`} icon={Wallet} />
          <StatCard label="Courses published" value={publishedCourses ?? 0} icon={BookOpen} />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-5">
          <div className="rounded-[var(--radius-md)] border border-border bg-surface p-5 shadow-[var(--shadow-xs)] lg:col-span-3">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-amber-600" />
              <h2 className="text-base font-bold text-foreground">New enrollments</h2>
              <span className="text-xs text-muted">· last {WEEKS_BACK} weeks</span>
            </div>
            <div className="mt-2">
              <TrendChart data={chartData} />
            </div>
          </div>

          <div className="rounded-[var(--radius-md)] border border-border bg-surface shadow-[var(--shadow-xs)] lg:col-span-2">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-base font-bold text-foreground">Recent applications</h2>
              <Link
                href="/admin/applications"
                className="flex items-center gap-1 text-sm text-ink-700 transition-colors hover:text-ink-900"
              >
                View all <ArrowRight size={14} />
              </Link>
            </div>

            {!recentApps || recentApps.length === 0 ? (
              <p className="px-5 py-8 text-sm text-muted">No applications yet.</p>
            ) : (
              <div className="divide-y divide-border">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {recentApps.map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between px-5 py-3.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{a.full_name}</p>
                      <p className="truncate text-xs text-muted">{a.courses?.title}</p>
                    </div>
                    <StatusBadge
                      dot
                      tone={
                        a.status === "accepted" || a.status === "enrolled"
                          ? "success"
                          : a.status === "rejected"
                          ? "danger"
                          : "amber"
                      }
                    >
                      {a.status}
                    </StatusBadge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
