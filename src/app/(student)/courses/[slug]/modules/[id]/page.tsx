import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, ImageIcon, LinkIcon, PlayCircle, ClipboardList, Radio, Lock } from "lucide-react";
import { TopBar } from "@/components/shell/topbar";
import { LessonCompleteToggle } from "@/components/course/lesson-complete-toggle";
import { MuxVideoPlayer } from "@/components/course/mux-video-player";
import { AssignmentSubmission } from "@/components/course/assignment-submission";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { signPlaybackId } from "@/lib/mux";

const ICONS = {
  video: PlayCircle,
  document: FileText,
  image: ImageIcon,
  text: FileText,
  link: LinkIcon,
  assignment: ClipboardList,
  live: Radio,
} as const;

export default async function ModulePage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: mod } = await supabase
    .from("modules")
    .select(
      `id, title, description, day_number, week_id, available_at,
       weeks(course_id),
       lessons(id, title, type, content_text, external_url, position, is_required,
         grading_type, grading_unit, max_score,
         assets(id, storage_path, mime_type, mux_status, mux_playback_id))`
    )
    .eq("id", id)
    .single();

  if (!mod) notFound();

  const locked = mod.available_at ? new Date(mod.available_at) > new Date() : false;
  if (locked) {
    return (
      <>
        <TopBar title={mod.title} />
        <div className="p-5 sm:p-8">
          <Link
            href={`/courses/${slug}`}
            className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
          >
            <ArrowLeft size={15} /> Back to course
          </Link>
          <div className="mt-6 rounded-[var(--radius-md)] border border-dashed border-border-strong bg-surface/50 p-10 text-center">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-paper-100 text-ink-500">
              <Lock size={20} strokeWidth={1.75} />
            </div>
            <p className="mt-4 text-lg font-bold text-foreground">This module isn&apos;t available yet</p>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted">
              It unlocks on{" "}
              {new Date(mod.available_at!).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
              .
            </p>
          </div>
        </div>
      </>
    );
  }

  // Record this as the student's resume point for the course, so their
  // dashboard and the course page can take them straight back here.
  const courseId = (mod as unknown as { weeks: { course_id: string } | null }).weeks?.course_id;
  if (courseId) {
    await supabase
      .from("last_viewed_module")
      .upsert(
        { student_id: profile.id, course_id: courseId, module_id: mod.id, viewed_at: new Date().toISOString() },
        { onConflict: "student_id,course_id" }
      );
  }

  const lessonIds = (mod.lessons ?? []).map((l) => l.id);
  const zeroUuid = "00000000-0000-0000-0000-000000000000";

  const [{ data: doneLessons }, { data: submissions }] = await Promise.all([
    supabase
      .from("lesson_progress")
      .select("lesson_id")
      .eq("student_id", profile.id)
      .in("lesson_id", lessonIds.length ? lessonIds : [zeroUuid]),
    supabase
      .from("submissions")
      .select("lesson_id, status, grade, feedback, created_at, link_url")
      .eq("student_id", profile.id)
      .in("lesson_id", lessonIds.length ? lessonIds : [zeroUuid])
      .order("created_at", { ascending: false }),
  ]);

  type SubmissionRow = {
    lesson_id: string;
    status: string;
    grade: number | null;
    feedback: string | null;
    created_at: string;
    link_url: string | null;
  };
  const doneSet = new Set((doneLessons ?? []).map((d) => d.lesson_id));
  const latestSubmissionByLesson = new Map<string, SubmissionRow>();
  for (const s of (submissions ?? []) as SubmissionRow[]) {
    if (!latestSubmissionByLesson.has(s.lesson_id)) latestSubmissionByLesson.set(s.lesson_id, s);
  }

  return (
    <>
      <TopBar title={mod.title} />
      <div className="p-5 sm:p-8">
        <Link
          href={`/courses/${slug}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft size={15} /> Back to course
        </Link>

        {mod.description && <p className="mt-4 max-w-2xl text-sm text-muted">{mod.description}</p>}

        <div className="mt-6 space-y-4">
          {(mod.lessons ?? [])
            .sort((a, b) => a.position - b.position)
            .map((lesson) => {
              const Icon = ICONS[lesson.type as keyof typeof ICONS] ?? FileText;
              const completed = doneSet.has(lesson.id);
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const asset = (lesson as any).assets?.[0] as
                | { storage_path: string | null; mime_type: string | null; mux_status: string | null; mux_playback_id: string | null }
                | undefined;

              return (
                <div
                  key={lesson.id}
                  className={`rounded-[var(--radius-md)] border bg-surface p-5 shadow-[var(--shadow-xs)] transition-colors ${
                    completed ? "border-success/25" : "border-border"
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] ${
                        completed ? "bg-success/10 text-success" : "bg-paper-100 text-ink-700"
                      }`}
                    >
                      <Icon size={17} strokeWidth={1.75} />
                    </span>
                    <div className="w-full pt-1">
                      <p className="text-sm font-medium text-foreground">{lesson.title}</p>
                      {lesson.content_text && (
                        <p className="mt-1 max-w-xl text-sm text-muted">{lesson.content_text}</p>
                      )}

                      {lesson.type === "video" && (
                        <div className="mt-3">
                          {asset?.mux_status === "ready" && asset.mux_playback_id ? (
                            <MuxVideoPlayer
                              playbackId={asset.mux_playback_id}
                              token={signPlaybackId(asset.mux_playback_id)}
                            />
                          ) : asset ? (
                            <p className="text-sm text-muted">Video is still processing — check back soon.</p>
                          ) : lesson.external_url ? (
                            <a
                              href={lesson.external_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sm text-ink-900 underline underline-offset-2"
                            >
                              Open video
                            </a>
                          ) : (
                            <p className="text-sm text-muted">Video hasn&apos;t been uploaded yet.</p>
                          )}
                        </div>
                      )}

                      {(lesson.type === "document" || lesson.type === "image") && (
                        <LessonFile
                          storagePath={asset?.storage_path ?? null}
                          mimeType={asset?.mime_type ?? null}
                          isImage={lesson.type === "image"}
                        />
                      )}

                      {lesson.type === "link" && lesson.external_url && (
                        <a
                          href={lesson.external_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-block text-sm text-ink-900 underline underline-offset-2"
                        >
                          Open link
                        </a>
                      )}
                      {lesson.type === "live" && lesson.external_url && (
                        <a
                          href={lesson.external_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-block text-sm text-ink-900 underline underline-offset-2"
                        >
                          Open live class link
                        </a>
                      )}

                      {lesson.type === "assignment" && (
                        <>
                          {asset?.storage_path && (
                            <LessonFile storagePath={asset.storage_path} mimeType={asset.mime_type} isImage={false} />
                          )}
                          <AssignmentSubmission
                            lessonId={lesson.id}
                            past={
                              latestSubmissionByLesson.has(lesson.id)
                                ? {
                                    status: latestSubmissionByLesson.get(lesson.id)!.status,
                                    grade: latestSubmissionByLesson.get(lesson.id)!.grade,
                                    feedback: latestSubmissionByLesson.get(lesson.id)!.feedback,
                                    submitted_at: latestSubmissionByLesson.get(lesson.id)!.created_at,
                                    link_url: latestSubmissionByLesson.get(lesson.id)!.link_url,
                                  }
                                : null
                            }
                            gradingType={lesson.grading_type}
                            gradingUnit={lesson.grading_unit}
                            maxScore={lesson.max_score}
                          />
                        </>
                      )}
                    </div>
                  </div>

                  {lesson.is_required && (
                    <div className="mt-4">
                      <LessonCompleteToggle
                        lessonId={lesson.id}
                        moduleId={mod.id}
                        courseSlug={slug}
                        completed={completed}
                      />
                    </div>
                  )}
                </div>
              );
            })}

          {(mod.lessons ?? []).length === 0 && (
            <p className="text-sm text-muted">Materials for this module haven&apos;t been added yet.</p>
          )}
        </div>
      </div>
    </>
  );
}

async function LessonFile({
  storagePath,
  mimeType,
  isImage,
}: {
  storagePath: string | null;
  mimeType: string | null;
  isImage: boolean;
}) {
  if (!storagePath) return <p className="mt-2 text-sm text-muted">File hasn&apos;t been uploaded yet.</p>;

  const supabase = await createClient();
  const { data } = await supabase.storage.from("course-materials").createSignedUrl(storagePath, 60 * 60);
  if (!data?.signedUrl) return <p className="mt-2 text-sm text-muted">Couldn&apos;t load this file.</p>;

  if (isImage) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={data.signedUrl} alt="" className="mt-2 max-w-full rounded-[var(--radius-sm)] border border-border" />;
  }

  // PDFs render inline — every modern browser can display them in an
  // iframe. Word/PowerPoint files don't have a reliable, private way to
  // embed in-browser, so those stay a direct-open link instead.
  if (mimeType === "application/pdf") {
    return (
      <div className="mt-2">
        <iframe
          src={data.signedUrl}
          className="h-[70vh] w-full rounded-[var(--radius-sm)] border border-border"
          title="Lesson document"
        />
        <a
          href={data.signedUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-block text-xs text-muted underline underline-offset-2"
        >
          Open in a new tab
        </a>
      </div>
    );
  }

  return (
    <a
      href={data.signedUrl}
      target="_blank"
      rel="noreferrer"
      className="mt-2 inline-block text-sm text-ink-900 underline underline-offset-2"
    >
      Open file
    </a>
  );
}
