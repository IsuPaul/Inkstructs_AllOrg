import { DashboardShell } from "@/components/shell/dashboard-shell";
import { requireProfile } from "@/lib/auth";
import { ADMIN_ITEMS } from "@/lib/nav-items";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();

  return (
    <DashboardShell items={ADMIN_ITEMS} portalLabel="Admin" userName={profile.full_name} userRole={profile.role}>
      {children}
    </DashboardShell>
  );
}
