import { DashboardShell } from "@/components/shell/dashboard-shell";
import { requireProfile } from "@/lib/auth";
import { INSTRUCTOR_ITEMS } from "@/lib/nav-items";

export default async function InstructorLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();

  return (
    <DashboardShell items={INSTRUCTOR_ITEMS} portalLabel="Instructor" userName={profile.full_name} userRole={profile.role}>
      {children}
    </DashboardShell>
  );
}
