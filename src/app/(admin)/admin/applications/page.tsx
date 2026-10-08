import { Inbox } from "lucide-react";
import { TopBar } from "@/components/shell/topbar";
import { EmptyState } from "@/components/ui/empty-state";
import { createClient } from "@/lib/supabase/server";
import { ApplicationRow } from "./application-row";

export default async function ApplicationsPage() {
  const supabase = await createClient();

  const { data: applications } = await supabase
    .from("applications")
    .select("id, full_name, email, status, course_id, courses(title)")
    .order("created_at", { ascending: false });

  // Offerings a student could be accepted into: a course, inside a cohort
  // that's currently taking students.
  const { data: offerings } = await supabase
    .from("cohort_courses")
    .select("id, course_id, cohorts!inner(name, status)")
    .in("cohorts.status", ["draft", "open"]);

  const offeringsByCourse = new Map<string, { id: string; name: string }[]>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const o of (offerings ?? []) as any[]) {
    const list = offeringsByCourse.get(o.course_id) ?? [];
    list.push({ id: o.id, name: o.cohorts.name });
    offeringsByCourse.set(o.course_id, list);
  }

  return (
    <>
      <TopBar title="Applications" />
      <div className="p-5 sm:p-8">
        <div className={applications && applications.length > 0 ? "rounded-[var(--radius-md)] border border-border bg-surface px-5 shadow-[var(--shadow-xs)]" : ""}>
          {!applications || applications.length === 0 ? (
            <EmptyState icon={Inbox} title="No applications yet" description="New applications from /apply will show up here for review." />
          ) : (
            /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
            applications.map((a: any) => (
              <ApplicationRow
                key={a.id}
                id={a.id}
                fullName={a.full_name}
                email={a.email}
                courseTitle={a.courses?.title ?? "—"}
                status={a.status}
                cohorts={offeringsByCourse.get(a.course_id) ?? []}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
}
