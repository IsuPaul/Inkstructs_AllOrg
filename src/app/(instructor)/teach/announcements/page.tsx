import { TopBar } from "@/components/shell/topbar";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";

export default async function InstructorAnnouncementsPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: announcements } = await supabase
    .from("announcements")
    .select("id, title, body, created_at, cohorts(name)")
    .eq("author_id", profile.id)
    .order("created_at", { ascending: false });

  return (
    <>
      <TopBar title="Announcements" />
      <div className="p-5 sm:p-8">
        <div className="rounded-[var(--radius-md)] border border-border bg-surface px-5 shadow-[var(--shadow-xs)]">
          {!announcements || announcements.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">
              You haven&apos;t posted anything yet. Posting is added to the cohort page in Phase 2.
            </p>
          ) : (
            /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
            announcements.map((a: any) => (
              <div key={a.id} className="rounded-[10px] border-b border-border px-1 py-4 transition-colors last:border-0 hover:bg-paper-100/50">
                <p className="text-sm font-medium text-foreground">{a.title}</p>
                <p className="mt-1 text-sm text-muted">{a.body}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
