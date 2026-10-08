import { DashboardShell } from "@/components/shell/dashboard-shell";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { STUDENT_ITEMS } from "@/lib/nav-items";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: hasUnread } = await supabase.rpc("has_unread_announcements");

  return (
    <DashboardShell
      items={STUDENT_ITEMS}
      portalLabel="Student"
      userName={profile.full_name}
      userRole={profile.role}
      badges={{ "/announcements": !!hasUnread }}
    >
      {children}
    </DashboardShell>
  );
}
