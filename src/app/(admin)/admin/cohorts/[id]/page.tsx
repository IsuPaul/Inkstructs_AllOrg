import { notFound } from "next/navigation";
import { TopBar } from "@/components/shell/topbar";
import { StatusBadge } from "@/components/ui/status-badge";
import { createClient } from "@/lib/supabase/server";
import {
  CohortStatusControl,
  EditCohortForm,
  DeleteCohortButton,
  AddCourseToCohortForm,
  EditCohortCourseForm,
  RemoveCohortCourseButton,
  InstructorAssignment,
  InviteStudentForm,
} from "./cohort-panel";

export default async function CohortDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: cohort } = await supabase
    .from("cohorts")
    .select("id, name, start_date, status")
    .eq("id", id)
    .single();
  if (!cohort) notFound();

  const [{ data: offerings }, { data: allCourses }, { data: allInstructors }] = await Promise.all([
    supabase
      .from("cohort_courses")
      .select(
        `id, price_kobo, capacity,
         courses(id, title),
         cohort_instructors(profiles(id, full_name, email)),
         enrollments(id, status, profiles(full_name, email))`
      )
      .eq("cohort_id", id),
    supabase.from("courses").select("id, title").order("title"),
    supabase.from("profiles").select("id, full_name, email").eq("role", "instructor").order("full_name"),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const offeredCourseIds = new Set((offerings ?? []).map((o: any) => o.courses?.id));
  const availableCourses = (allCourses ?? []).filter((c) => !offeredCourseIds.has(c.id));

  return (
    <>
      <TopBar title={cohort.name} />
      <div className="space-y-6 p-5 sm:p-8">
        <div className="rounded-[var(--radius-md)] border border-border bg-surface p-5">
          <h2 className="text-lg font-bold text-foreground">Details</h2>
          <dl className="mt-3 flex flex-wrap gap-6 text-sm">
            <div>
              <dt className="text-xs text-muted">Starts</dt>
              <dd className="text-foreground">{cohort.start_date}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Status</dt>
              <dd>
                <StatusBadge tone={cohort.status === "running" ? "success" : "neutral"}>{cohort.status}</StatusBadge>
              </dd>
            </div>
          </dl>
          <div className="mt-4">
            <CohortStatusControl cohortId={cohort.id} status={cohort.status} />
          </div>
        </div>

        <div className="rounded-[var(--radius-md)] border border-border bg-surface p-5">
          <h2 className="text-lg font-bold text-foreground">Edit cohort</h2>
          <div className="mt-3">
            <EditCohortForm cohortId={cohort.id} initialName={cohort.name} initialStartDate={cohort.start_date} />
          </div>
        </div>

        <div>
          <h2 className="px-1 text-lg font-bold text-foreground">Courses in this cohort</h2>
          <p className="px-1 text-sm text-muted">
            Each course offered here has its own price, capacity, instructors and enrolled students — a student
            enrolled in one course under this cohort never sees the others.
          </p>

          <div className="mt-3 space-y-4">
            {(offerings ?? []).length === 0 && (
              <p className="rounded-[var(--radius-md)] border border-dashed border-border-strong bg-surface/50 p-6 text-center text-sm text-muted">
                No courses added to this cohort yet.
              </p>
            )}

            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(offerings ?? []).map((o: any) => (
              <div key={o.id} className="overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface shadow-[var(--shadow-xs)]">
                <div className="flex items-center justify-between border-b border-border bg-paper-50 px-5 py-3.5">
                  <div>
                    <p className="font-bold text-foreground">{o.courses?.title}</p>
                    <p className="text-xs text-muted">
                      ₦{(o.price_kobo / 100).toLocaleString()}
                      {o.capacity ? ` · capacity ${o.capacity}` : ""} · {o.enrollments?.length ?? 0} enrolled
                    </p>
                  </div>
                  <RemoveCohortCourseButton cohortCourseId={o.id} cohortId={cohort.id} />
                </div>

                <div className="space-y-5 p-5">
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Price & capacity</p>
                    <EditCohortCourseForm
                      cohortCourseId={o.id}
                      cohortId={cohort.id}
                      initialPriceNaira={o.price_kobo / 100}
                      initialCapacity={o.capacity}
                    />
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Instructors</p>
                    <InstructorAssignment
                      cohortCourseId={o.id}
                      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                      assigned={(o.cohort_instructors ?? []).map((ci: any) => ci.profiles).filter(Boolean)}
                      allInstructors={allInstructors ?? []}
                    />
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Invite a student directly</p>
                    <InviteStudentForm cohortCourseId={o.id} />
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Students</p>
                    {(o.enrollments ?? []).length === 0 ? (
                      <p className="text-sm text-muted">No students enrolled yet.</p>
                    ) : (
                      <div className="divide-y divide-border">
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {o.enrollments.map((e: any) => (
                          <div key={e.id} className="flex items-center justify-between py-2.5">
                            <div>
                              <p className="text-sm text-foreground">{e.profiles?.full_name}</p>
                              <p className="text-xs text-muted">{e.profiles?.email}</p>
                            </div>
                            <StatusBadge tone={e.status === "active" ? "success" : "neutral"}>{e.status}</StatusBadge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-[var(--radius-md)] border border-border bg-surface p-5">
            <p className="mb-3 text-sm font-medium text-foreground">Add a course to this cohort</p>
            <AddCourseToCohortForm cohortId={cohort.id} availableCourses={availableCourses} />
          </div>
        </div>

        <div className="rounded-[var(--radius-md)] border border-danger/25 bg-danger/[0.03] p-5">
          <h2 className="text-lg font-bold text-foreground">Danger zone</h2>
          <p className="mt-1 text-sm text-muted">
            Only cohorts where no course has enrolled students can be deleted. Once students join, mark it
            &quot;completed&quot; instead of deleting it.
          </p>
          <div className="mt-4">
            <DeleteCohortButton cohortId={cohort.id} />
          </div>
        </div>
      </div>
    </>
  );
}
