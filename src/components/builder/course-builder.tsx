"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  Pencil,
  Video,
  FileText,
  ImageIcon,
  LinkIcon,
  ClipboardList,
  Radio,
  ChevronDown,
  Clock,
} from "lucide-react";
import {
  addModule,
  deleteModule,
  addLesson,
  updateLesson,
  deleteLesson,
  updateModuleAvailability,
  type GradingConfig,
} from "@/actions/course-builder";
import { deleteLessonAsset } from "@/actions/media";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { VideoUploader } from "./video-uploader";
import { FileUploader } from "./file-uploader";

type Asset = {
  id: string;
  storage_path: string | null;
  mux_status: string | null;
};
type Lesson = {
  id: string;
  title: string;
  type: string;
  content_text: string | null;
  external_url: string | null;
  is_required: boolean;
  assets: Asset[];
  grading_type: "fraction" | "whole_number" | null;
  grading_unit: "percentage" | "unitless" | null;
  max_score: number | null;
};
type ModuleT = {
  id: string;
  day_number: number;
  title: string;
  description: string | null;
  available_at: string | null;
  lessons: Lesson[];
};
type WeekT = {
  id: string;
  week_number: number;
  title: string;
  modules: ModuleT[];
};

const LESSON_TYPES = [
  { value: "video", label: "Video" },
  { value: "document", label: "Document" },
  { value: "image", label: "Image" },
  { value: "text", label: "Text" },
  { value: "link", label: "Link" },
  { value: "assignment", label: "Assignment" },
  { value: "live", label: "Live class" },
];

const TYPE_ICONS: Record<string, typeof Video> = {
  video: Video,
  document: FileText,
  image: ImageIcon,
  text: FileText,
  link: LinkIcon,
  assignment: ClipboardList,
  live: Radio,
};

// --- datetime-local <-> ISO helpers -----------------------------------
// datetime-local inputs work in the browser's local time with no timezone
// info; Date correctly treats a bare "YYYY-MM-DDTHH:mm" string as local
// time, so round-tripping through it is enough to get a correct UTC ISO
// string back out.
function isoToDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function datetimeLocalToIso(value: string): string | null {
  if (!value) return null;
  return new Date(value).toISOString();
}
function formatAvailableAt(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function CourseBuilder({ weeks }: { weeks: WeekT[] }) {
  return (
    <div className="space-y-4">
      {weeks.map((week) => (
        <WeekSection key={week.id} week={week} />
      ))}
    </div>
  );
}

function WeekSection({ week }: { week: WeekT }) {
  const [addingModule, setAddingModule] = useState(false);
  const [expanded, setExpanded] = useState(true);

  // Header previews the first module (by day) rather than repeating the week title.
  const sortedModules = [...week.modules].sort((a, b) => a.day_number - b.day_number);
  const firstModule = sortedModules[0];

  return (
    <section className="overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface shadow-[var(--shadow-xs)]">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-paper-100/60"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-ink-900 text-sm font-bold text-paper-50">
            {week.week_number}
          </span>
          <div>
            <p className="text-xs font-medium text-muted">Week {week.week_number}</p>
            {firstModule ? (
              <>
                <h2 className="text-lg font-bold leading-tight text-foreground">{firstModule.title}</h2>
                <p className="text-xs text-muted">
                  {firstModule.available_at
                    ? `${new Date(firstModule.available_at) > new Date() ? "Unlocks" : "Opened"} ${formatAvailableAt(firstModule.available_at)}`
                    : "Available immediately"}
                  {sortedModules.length > 1 && ` · +${sortedModules.length - 1} more`}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted">No modules yet</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted">
            {week.modules.length} module{week.modules.length === 1 ? "" : "s"}
          </span>
          <ChevronDown size={18} className={`text-muted transition-transform ${expanded ? "rotate-180" : ""}`} />
        </div>
      </button>

      {expanded && (
        <>
          <div className="divide-y divide-border border-t border-border">
            {week.modules
              .sort((a, b) => a.day_number - b.day_number)
              .map((mod) => (
                <ModuleCard key={mod.id} module={mod} />
              ))}
          </div>

          <div className="border-t border-border p-4">
            {addingModule ? (
              <AddModuleForm weekId={week.id} onDone={() => setAddingModule(false)} />
            ) : (
              <button
                onClick={() => setAddingModule(true)}
                className="flex items-center gap-1.5 text-sm font-medium text-ink-900 transition-opacity hover:opacity-70"
              >
                <Plus size={15} /> Add module
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
}

function AvailabilityFields({
  scheduled,
  setScheduled,
  value,
  setValue,
}: {
  scheduled: boolean;
  setScheduled: (v: boolean) => void;
  value: string;
  setValue: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex gap-4">
        <label className="flex items-center gap-1.5 text-xs text-foreground">
          <input type="radio" checked={!scheduled} onChange={() => setScheduled(false)} />
          Available immediately
        </label>
        <label className="flex items-center gap-1.5 text-xs text-foreground">
          <input type="radio" checked={scheduled} onChange={() => setScheduled(true)} />
          Schedule for later
        </label>
      </div>
      {scheduled && (
        <Input type="datetime-local" value={value} onChange={(e) => setValue(e.target.value)} />
      )}
    </div>
  );
}

function AddModuleForm({ weekId, onDone }: { weekId: string; onDone: () => void }) {
  const router = useRouter();
  const [dayNumber, setDayNumber] = useState(1);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scheduled, setScheduled] = useState(false);
  const [availableAt, setAvailableAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-3 rounded-[var(--radius-sm)] bg-paper-100 p-3">
      <div className="grid grid-cols-[80px_1fr] gap-2">
        <Field label="Day" htmlFor="day">
          <Input id="day" type="number" min={1} value={dayNumber} onChange={(e) => setDayNumber(Number(e.target.value))} />
        </Field>
        <Field label="Module title" htmlFor="mtitle">
          <Input id="mtitle" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Intro to variables" />
        </Field>
      </div>
      <Field label="Description (optional)" htmlFor="mdesc">
        <textarea
          id="mdesc"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-2 text-sm text-foreground"
        />
      </Field>
      <div>
        <p className="mb-1.5 text-xs font-medium text-ink-700">When should this unlock for students?</p>
        <AvailabilityFields scheduled={scheduled} setScheduled={setScheduled} value={availableAt} setValue={setAvailableAt} />
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
      <div className="flex gap-2">
        <Button
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await addModule(weekId, dayNumber, title, description, datetimeLocalToIso(scheduled ? availableAt : ""));
              if (res.error) setError(res.error);
              else {
                router.refresh();
                onDone();
              }
            })
          }
        >
          {pending ? "Adding…" : "Add module"}
        </Button>
        <Button variant="secondary" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function ModuleCard({ module: mod }: { module: ModuleT }) {
  const router = useRouter();
  const [addingLesson, setAddingLesson] = useState(false);
  const [editingAvailability, setEditingAvailability] = useState(false);
  const [scheduled, setScheduled] = useState(!!mod.available_at);
  const [availableAt, setAvailableAt] = useState(isoToDatetimeLocal(mod.available_at));
  const [pending, startTransition] = useTransition();

  const isLocked = mod.available_at ? new Date(mod.available_at) > new Date() : false;

  return (
    <div className="bg-paper-50/40 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-paper-100 px-2 py-0.5 text-[11px] font-medium text-ink-700">
            Day {mod.day_number}
          </span>
          <div>
            <p className="text-sm font-medium text-foreground">{mod.title}</p>
            {mod.description && <p className="mt-0.5 text-xs text-muted">{mod.description}</p>}
          </div>
        </div>
        <button
          disabled={pending}
          onClick={() => {
            if (!confirm(`Delete "${mod.title}" and all its lessons?`)) return;
            startTransition(async () => {
              await deleteModule(mod.id);
              router.refresh();
            });
          }}
          className="shrink-0 rounded-md p-1.5 text-ink-300 transition-colors hover:bg-danger/10 hover:text-danger"
        >
          <Trash2 size={15} />
        </button>
      </div>

      <div className="mt-2.5">
        {editingAvailability ? (
          <div className="max-w-xs space-y-2 rounded-[var(--radius-sm)] border border-border bg-surface p-3">
            <AvailabilityFields scheduled={scheduled} setScheduled={setScheduled} value={availableAt} setValue={setAvailableAt} />
            <div className="flex gap-2">
              <Button
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    await updateModuleAvailability(mod.id, datetimeLocalToIso(scheduled ? availableAt : ""));
                    router.refresh();
                    setEditingAvailability(false);
                  })
                }
                className="px-3 py-1.5 text-xs"
              >
                Save
              </Button>
              <Button variant="secondary" onClick={() => setEditingAvailability(false)} className="px-3 py-1.5 text-xs">
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setEditingAvailability(true)}
            className="flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-ink-900"
          >
            <Clock size={12} />
            {mod.available_at ? (
              <span className={isLocked ? "text-amber-600" : ""}>
                {isLocked ? "Unlocks" : "Unlocked"} {formatAvailableAt(mod.available_at)}
              </span>
            ) : (
              "Available immediately"
            )}
            <Pencil size={11} className="opacity-50" />
          </button>
        )}
      </div>

      <div className="mt-3.5 space-y-1.5 border-l-2 border-paper-200 pl-4">
        {mod.lessons.map((lesson) => (
          <LessonRow key={lesson.id} lesson={lesson} />
        ))}
      </div>

      <div className="mt-3 pl-4">
        {addingLesson ? (
          <AddLessonForm moduleId={mod.id} onDone={() => setAddingLesson(false)} />
        ) : (
          <button
            onClick={() => setAddingLesson(true)}
            className="flex items-center gap-1.5 text-xs font-medium text-ink-900 transition-opacity hover:opacity-70"
          >
            <Plus size={13} /> Add lesson
          </button>
        )}
      </div>
    </div>
  );
}

function GradingFields({
  gradingType,
  setGradingType,
  gradingUnit,
  setGradingUnit,
  maxScore,
  setMaxScore,
}: {
  gradingType: "fraction" | "whole_number";
  setGradingType: (v: "fraction" | "whole_number") => void;
  gradingUnit: "percentage" | "unitless";
  setGradingUnit: (v: "percentage" | "unitless") => void;
  maxScore: string;
  setMaxScore: (v: string) => void;
}) {
  return (
    <div className="space-y-2 rounded-[var(--radius-sm)] border border-border bg-surface p-3">
      <p className="text-xs font-medium text-ink-700">Grading format</p>
      <div className="flex gap-4">
        <label className="flex items-center gap-1.5 text-xs text-foreground">
          <input type="radio" checked={gradingType === "whole_number"} onChange={() => setGradingType("whole_number")} />
          Whole number
        </label>
        <label className="flex items-center gap-1.5 text-xs text-foreground">
          <input type="radio" checked={gradingType === "fraction"} onChange={() => setGradingType("fraction")} />
          Fraction (score / max)
        </label>
      </div>
      {gradingType === "whole_number" ? (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">Unit:</span>
          <select
            value={gradingUnit}
            onChange={(e) => setGradingUnit(e.target.value as "percentage" | "unitless")}
            className="rounded-[var(--radius-sm)] border border-border bg-surface px-2 py-1.5 text-xs text-foreground"
          >
            <option value="percentage">Percentage (%)</option>
            <option value="unitless">Unitless (plain number)</option>
          </select>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">Out of:</span>
          <Input
            type="number"
            min={1}
            value={maxScore}
            onChange={(e) => setMaxScore(e.target.value)}
            className="w-24 py-1.5 text-xs"
          />
        </div>
      )}
    </div>
  );
}

function AddLessonForm({ moduleId, onDone }: { moduleId: string; onDone: () => void }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [type, setType] = useState("video");
  const [contentText, setContentText] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [isRequired, setIsRequired] = useState(true);
  const [gradingType, setGradingType] = useState<"fraction" | "whole_number">("whole_number");
  const [gradingUnit, setGradingUnit] = useState<"percentage" | "unitless">("percentage");
  const [maxScore, setMaxScore] = useState("10");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const needsUrl = type === "link" || type === "live";
  const needsText = type === "text" || type === "assignment";

  return (
    <div className="space-y-3 rounded-[var(--radius-sm)] bg-paper-100 p-3">
      <div className="grid grid-cols-[1fr_140px] gap-2">
        <Field label="Lesson title" htmlFor="ltitle">
          <Input id="ltitle" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What is a variable?" />
        </Field>
        <Field label="Type" htmlFor="ltype">
          <select
            id="ltype"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-2.5 text-sm text-foreground"
          >
            {LESSON_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {needsUrl && (
        <Field label={type === "live" ? "Meeting link" : "URL"} htmlFor="lurl">
          <Input id="lurl" value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} placeholder="https://" />
        </Field>
      )}
      {needsText && (
        <Field label={type === "assignment" ? "Instructions" : "Content"} htmlFor="ltext">
          <textarea
            id="ltext"
            rows={3}
            value={contentText}
            onChange={(e) => setContentText(e.target.value)}
            className="w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-2 text-sm text-foreground"
          />
        </Field>
      )}
      {(type === "video" || type === "document" || type === "image") && (
        <p className="text-xs text-muted">You can upload the file right after adding this lesson.</p>
      )}
      {type === "assignment" && (
        <GradingFields
          gradingType={gradingType}
          setGradingType={setGradingType}
          gradingUnit={gradingUnit}
          setGradingUnit={setGradingUnit}
          maxScore={maxScore}
          setMaxScore={setMaxScore}
        />
      )}

      <label className="flex items-center gap-2 text-xs text-foreground">
        <input type="checkbox" checked={isRequired} onChange={(e) => setIsRequired(e.target.checked)} />
        Required to mark the module complete
      </label>

      {error && <p className="text-xs text-danger">{error}</p>}
      <div className="flex gap-2">
        <Button
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const grading: GradingConfig | undefined =
                type === "assignment"
                  ? {
                      gradingType,
                      gradingUnit: gradingType === "whole_number" ? gradingUnit : null,
                      maxScore: gradingType === "fraction" ? Number(maxScore) || null : null,
                    }
                  : undefined;
              const res = await addLesson(moduleId, title, type, contentText, externalUrl, isRequired, grading);
              if (res.error) setError(res.error);
              else {
                router.refresh();
                onDone();
              }
            })
          }
        >
          {pending ? "Adding…" : "Add lesson"}
        </Button>
        <Button variant="secondary" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function gradingSummary(lesson: Lesson): string | null {
  if (lesson.type !== "assignment") return null;
  if (lesson.grading_type === "fraction" && lesson.max_score) return `Graded out of ${lesson.max_score}`;
  if (lesson.grading_type === "whole_number" && lesson.grading_unit === "percentage") return "Graded as %";
  if (lesson.grading_type === "whole_number" && lesson.grading_unit === "unitless") return "Graded, unitless";
  return "Grading not set up yet";
}

function LessonRow({ lesson }: { lesson: Lesson }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(lesson.title);
  const [contentText, setContentText] = useState(lesson.content_text ?? "");
  const [externalUrl, setExternalUrl] = useState(lesson.external_url ?? "");
  const [isRequired, setIsRequired] = useState(lesson.is_required);
  const [gradingType, setGradingType] = useState<"fraction" | "whole_number">(lesson.grading_type ?? "whole_number");
  const [gradingUnit, setGradingUnit] = useState<"percentage" | "unitless">(lesson.grading_unit ?? "percentage");
  const [maxScore, setMaxScore] = useState(String(lesson.max_score ?? "10"));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const Icon = TYPE_ICONS[lesson.type] ?? FileText;
  const asset = lesson.assets?.[0];

  if (editing) {
    const needsUrl = lesson.type === "link" || lesson.type === "live";
    const needsText = lesson.type === "text" || lesson.type === "assignment";
    return (
      <div className="space-y-2 rounded-[var(--radius-sm)] bg-paper-100 p-3">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        {needsUrl && <Input value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} placeholder="https://" />}
        {needsText && (
          <textarea
            rows={3}
            value={contentText}
            onChange={(e) => setContentText(e.target.value)}
            className="w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-2 text-sm text-foreground"
          />
        )}
        {lesson.type === "assignment" && (
          <GradingFields
            gradingType={gradingType}
            setGradingType={setGradingType}
            gradingUnit={gradingUnit}
            setGradingUnit={setGradingUnit}
            maxScore={maxScore}
            setMaxScore={setMaxScore}
          />
        )}
        <label className="flex items-center gap-2 text-xs text-foreground">
          <input type="checkbox" checked={isRequired} onChange={(e) => setIsRequired(e.target.checked)} />
          Required
        </label>
        {error && <p className="text-xs text-danger">{error}</p>}
        <div className="flex gap-2">
          <Button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const grading: GradingConfig | undefined =
                  lesson.type === "assignment"
                    ? {
                        gradingType,
                        gradingUnit: gradingType === "whole_number" ? gradingUnit : null,
                        maxScore: gradingType === "fraction" ? Number(maxScore) || null : null,
                      }
                    : undefined;
                const res = await updateLesson(lesson.id, title, contentText, externalUrl, isRequired, grading);
                if (res.error) setError(res.error);
                else {
                  router.refresh();
                  setEditing(false);
                }
              })
            }
          >
            Save
          </Button>
          <Button variant="secondary" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  const summary = gradingSummary(lesson);

  return (
    <div className="group flex items-start justify-between gap-3 rounded-[10px] px-2 py-2 transition-colors hover:bg-paper-100/70">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-paper-100 text-ink-700">
          <Icon size={13} strokeWidth={1.75} />
        </span>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm text-foreground">{lesson.title}</p>
            {!lesson.is_required && <StatusBadge>optional</StatusBadge>}
            {summary && <StatusBadge tone="amber">{summary}</StatusBadge>}
          </div>

          {lesson.type === "video" && (
            <div className="mt-1.5 flex items-center gap-2">
              <VideoUploader lessonId={lesson.id} hasVideo={!!asset} />
              {asset && (
                <StatusBadge tone={asset.mux_status === "ready" ? "success" : "amber"}>
                  {asset.mux_status === "ready" ? "Ready" : asset.mux_status ?? "Preparing"}
                </StatusBadge>
              )}
            </div>
          )}
          {(lesson.type === "document" || lesson.type === "image" || lesson.type === "assignment") && (
            <div className="mt-1.5">
              {lesson.type === "assignment" && (
                <p className="mb-1 text-xs text-muted">Optional: attach a worksheet or prompt document for students.</p>
              )}
              <div className="flex items-center gap-2">
                <FileUploader
                  lessonId={lesson.id}
                  hasFile={!!asset?.storage_path}
                  accept={lesson.type === "image" ? "image/*" : ".pdf,.doc,.docx,.ppt,.pptx,.zip"}
                />
                {asset?.storage_path && <StatusBadge tone="success">Uploaded</StatusBadge>}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button onClick={() => setEditing(true)} className="rounded-md p-1.5 text-ink-300 transition-colors hover:bg-paper-200 hover:text-ink-900">
          <Pencil size={14} />
        </button>
        <button
          disabled={pending}
          onClick={() => {
            if (!confirm(`Delete "${lesson.title}"?`)) return;
            startTransition(async () => {
              if (asset) await deleteLessonAsset(lesson.id);
              await deleteLesson(lesson.id);
              router.refresh();
            });
          }}
          className="rounded-md p-1.5 text-ink-300 transition-colors hover:bg-danger/10 hover:text-danger"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
