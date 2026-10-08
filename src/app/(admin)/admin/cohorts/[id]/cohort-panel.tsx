"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import {
  updateCohortStatus,
  assignInstructor,
  removeInstructor,
  updateCohort,
  deleteCohort,
  addCourseToCohort,
  updateCohortCourse,
  removeCourseFromCohort,
} from "@/actions/admin-content";
import { inviteStudentToCohortCourse } from "@/actions/admin-students";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

type Instructor = { id: string; full_name: string; email: string };
type Course = { id: string; title: string };

export function CohortStatusControl({ cohortId, status }: { cohortId: string; status: string }) {
  const [value, setValue] = useState(status);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2">
      <select
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-2 text-sm text-foreground"
      >
        {["draft", "open", "running", "completed"].map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <Button
        variant="secondary"
        disabled={pending || value === status}
        onClick={() => startTransition(async () => { await updateCohortStatus(cohortId, value); })}
      >
        {pending ? "Saving…" : "Update status"}
      </Button>
    </div>
  );
}

export function EditCohortForm({
  cohortId,
  initialName,
  initialStartDate,
}: {
  cohortId: string;
  initialName: string;
  initialStartDate: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Cohort name" htmlFor="edit_name">
        <Input id="edit_name" value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Start date" htmlFor="edit_start_date">
        <Input id="edit_start_date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
      </Field>

      {error && <p className="text-sm text-danger sm:col-span-2">{error}</p>}
      {success && <p className="text-sm text-success sm:col-span-2">Saved.</p>}

      <div className="sm:col-span-2">
        <Button
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              setSuccess(false);
              const formData = new FormData();
              formData.set("name", name);
              formData.set("start_date", startDate);
              const res = await updateCohort(cohortId, formData);
              if (res.error) setError(res.error);
              else {
                setSuccess(true);
                router.refresh();
              }
            })
          }
        >
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}

export function DeleteCohortButton({ cohortId }: { cohortId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div>
      <Button
        variant="danger"
        disabled={pending}
        onClick={() => {
          if (!confirm("Delete this cohort? This can't be undone.")) return;
          startTransition(async () => {
            setError(null);
            const res = await deleteCohort(cohortId);
            if (res.error) setError(res.error);
            else router.push("/admin/cohorts");
          });
        }}
      >
        {pending ? "Deleting…" : "Delete cohort"}
      </Button>
      {error && <p className="mt-2 max-w-md text-sm text-danger">{error}</p>}
    </div>
  );
}

// ===================== Courses within this cohort =====================

export function AddCourseToCohortForm({ cohortId, availableCourses }: { cohortId: string; availableCourses: Course[] }) {
  const router = useRouter();
  const [courseId, setCourseId] = useState(availableCourses[0]?.id ?? "");
  const [priceNaira, setPriceNaira] = useState("0");
  const [capacity, setCapacity] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (availableCourses.length === 0) {
    return <p className="text-sm text-muted">Every published course is already offered in this cohort.</p>;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Field label="Course" htmlFor="add_course">
        <select
          id="add_course"
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
          className="w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-2.5 text-sm text-foreground"
        >
          {availableCourses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Price (₦)" htmlFor="add_price">
        <Input id="add_price" type="number" min={0} value={priceNaira} onChange={(e) => setPriceNaira(e.target.value)} />
      </Field>
      <Field label="Capacity (optional)" htmlFor="add_capacity">
        <Input id="add_capacity" type="number" min={0} value={capacity} onChange={(e) => setCapacity(e.target.value)} />
      </Field>

      {error && <p className="text-sm text-danger sm:col-span-3">{error}</p>}

      <div className="sm:col-span-3">
        <Button
          disabled={pending || !courseId}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const formData = new FormData();
              formData.set("course_id", courseId);
              formData.set("price_naira", priceNaira);
              formData.set("capacity", capacity);
              const res = await addCourseToCohort(cohortId, formData);
              if (res.error) setError(res.error);
              else router.refresh();
            })
          }
        >
          {pending ? "Adding…" : "Add course to cohort"}
        </Button>
      </div>
    </div>
  );
}

export function EditCohortCourseForm({
  cohortCourseId,
  cohortId,
  initialPriceNaira,
  initialCapacity,
}: {
  cohortCourseId: string;
  cohortId: string;
  initialPriceNaira: number;
  initialCapacity: number | null;
}) {
  const router = useRouter();
  const [priceNaira, setPriceNaira] = useState(String(initialPriceNaira));
  const [capacity, setCapacity] = useState(initialCapacity ? String(initialCapacity) : "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap items-end gap-2">
      <Field label="Price (₦)" htmlFor={`price_${cohortCourseId}`}>
        <Input
          id={`price_${cohortCourseId}`}
          type="number"
          min={0}
          value={priceNaira}
          onChange={(e) => setPriceNaira(e.target.value)}
          className="w-28"
        />
      </Field>
      <Field label="Capacity" htmlFor={`cap_${cohortCourseId}`}>
        <Input
          id={`cap_${cohortCourseId}`}
          type="number"
          min={0}
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          className="w-24"
        />
      </Field>
      <Button
        variant="secondary"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const formData = new FormData();
            formData.set("price_naira", priceNaira);
            formData.set("capacity", capacity);
            const res = await updateCohortCourse(cohortCourseId, cohortId, formData);
            if (res.error) setError(res.error);
            else router.refresh();
          })
        }
        className="px-3 py-2 text-xs"
      >
        Save
      </Button>
      {error && <p className="w-full text-xs text-danger">{error}</p>}
    </div>
  );
}

export function RemoveCohortCourseButton({ cohortCourseId, cohortId }: { cohortCourseId: string; cohortId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div>
      <button
        disabled={pending}
        onClick={() => {
          if (!confirm("Remove this course from the cohort?")) return;
          startTransition(async () => {
            setError(null);
            const res = await removeCourseFromCohort(cohortCourseId, cohortId);
            if (res.error) setError(res.error);
            else router.refresh();
          });
        }}
        className="text-xs text-muted transition-colors hover:text-danger"
      >
        Remove course
      </button>
      {error && <p className="mt-1 max-w-xs text-xs text-danger">{error}</p>}
    </div>
  );
}

// ===================== Instructors & students (per course-within-cohort) =====================

export function InstructorAssignment({
  cohortCourseId,
  assigned,
  allInstructors,
}: {
  cohortCourseId: string;
  assigned: Instructor[];
  allInstructors: Instructor[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const assignedIds = new Set(assigned.map((i) => i.id));
  const available = allInstructors.filter((i) => !assignedIds.has(i.id));
  const [selected, setSelected] = useState(available[0]?.id ?? "");

  return (
    <div>
      <div className="space-y-2">
        {assigned.length === 0 ? (
          <p className="text-sm text-muted">No instructor assigned yet.</p>
        ) : (
          assigned.map((i) => (
            <div key={i.id} className="flex items-center justify-between rounded-[var(--radius-sm)] bg-paper-100 px-3 py-2">
              <div>
                <p className="text-sm text-foreground">{i.full_name}</p>
                <p className="text-xs text-muted">{i.email}</p>
              </div>
              <button
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    await removeInstructor(cohortCourseId, i.id);
                    router.refresh();
                  })
                }
                className="text-muted hover:text-danger"
              >
                <X size={16} />
              </button>
            </div>
          ))
        )}
      </div>

      {available.length > 0 && (
        <div className="mt-3 flex items-center gap-2">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-2 text-sm text-foreground"
          >
            {available.map((i) => (
              <option key={i.id} value={i.id}>
                {i.full_name}
              </option>
            ))}
          </select>
          <Button
            variant="secondary"
            disabled={pending || !selected}
            onClick={() =>
              startTransition(async () => {
                await assignInstructor(cohortCourseId, selected);
                router.refresh();
              })
            }
          >
            Assign
          </Button>
        </div>
      )}
      {available.length === 0 && assigned.length === 0 && (
        <p className="mt-2 text-xs text-muted">
          No instructor accounts exist yet — invite one from /admin/instructors.
        </p>
      )}
    </div>
  );
}

export function InviteStudentForm({ cohortCourseId }: { cohortCourseId: string }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [isFree, setIsFree] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Full name" htmlFor={`inv_name_${cohortCourseId}`}>
        <Input id={`inv_name_${cohortCourseId}`} value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </Field>
      <Field label="Email" htmlFor={`inv_email_${cohortCourseId}`}>
        <Input id={`inv_email_${cohortCourseId}`} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>

      <div className="sm:col-span-2">
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" checked={isFree} onChange={(e) => setIsFree(e.target.checked)} />
          Free access — skip payment, activate immediately
        </label>
        {!isFree && (
          <p className="mt-1 text-xs text-muted">
            Left unchecked, this student is enrolled as &quot;pending payment&quot; until Paystack checkout is
            connected (Phase 3).
          </p>
        )}
      </div>

      {error && <p className="text-sm text-danger sm:col-span-2">{error}</p>}
      {success && <p className="text-sm text-success sm:col-span-2">Invite sent.</p>}

      <div className="sm:col-span-2">
        <Button
          disabled={pending || !fullName.trim() || !email.trim()}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              setSuccess(false);
              const res = await inviteStudentToCohortCourse(cohortCourseId, fullName, email, isFree);
              if (res.error) setError(res.error);
              else {
                setSuccess(true);
                setFullName("");
                setEmail("");
                setIsFree(false);
              }
            })
          }
        >
          {pending ? "Sending…" : "Invite student"}
        </Button>
      </div>
    </div>
  );
}
