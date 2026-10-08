import { TopBar } from "@/components/shell/topbar";
import { StatusBadge } from "@/components/ui/status-badge";
import { ActiveToggle } from "@/components/admin/active-toggle";
import { createClient } from "@/lib/supabase/server";
import { InviteInstructorForm } from "./invite-form";

export default async function AdminInstructorsPage() {
  const supabase = await createClient();
  const { data: instructors } = await supabase
    .from("profiles")
    .select("id, full_name, email, is_active")
    .eq("role", "instructor")
    .order("full_name");

  return (
    <>
      <TopBar title="Instructors" />
      <div className="space-y-6 p-5 sm:p-8">
        <div className="rounded-[var(--radius-md)] border border-border bg-surface p-5">
          <h2 className="font-display text-lg text-foreground">Invite an instructor</h2>
          <p className="mt-1 text-sm text-muted">They&apos;ll get an email to set their password and sign in.</p>
          <div className="mt-4">
            <InviteInstructorForm />
          </div>
        </div>

        <div className="rounded-[var(--radius-md)] border border-border bg-surface px-5 shadow-[var(--shadow-xs)]">
          {!instructors || instructors.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">No instructors yet.</p>
          ) : (
            instructors.map((i) => (
              <div
                key={i.id}
                className="flex items-center justify-between gap-3 rounded-[10px] border-b border-border px-1 py-4 transition-colors last:border-0 hover:bg-paper-100/50"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-foreground">{i.full_name}</p>
                    {!i.is_active && (
                      <StatusBadge tone="danger" dot>
                        Deactivated
                      </StatusBadge>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted">{i.email}</p>
                </div>
                <ActiveToggle userId={i.id} isActive={i.is_active} />
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
