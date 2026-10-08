import { DashboardShell } from "@/components/shell/dashboard-shell";
import { TopBar } from "@/components/shell/topbar";
import { requireFullProfile } from "@/lib/auth";
import { itemsForRole, PORTAL_LABEL } from "@/lib/nav-items";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const profile = await requireFullProfile();

  return (
    <DashboardShell
      items={itemsForRole(profile.role)}
      portalLabel={PORTAL_LABEL[profile.role]}
      userName={profile.full_name}
      userRole={profile.role}
    >
      <TopBar title="Profile" />
      <div className="p-5 sm:p-8">
        <ProfileForm profile={profile} />
      </div>
    </DashboardShell>
  );
}
