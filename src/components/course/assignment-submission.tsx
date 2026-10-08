"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitAssignment } from "@/actions/submissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatGrade, type GradingType, type GradingUnit } from "@/lib/grading";

type PastSubmission = {
  status: string;
  grade: number | null;
  feedback: string | null;
  submitted_at: string;
  link_url: string | null;
};

export function AssignmentSubmission({
  lessonId,
  past,
  gradingType = null,
  gradingUnit = null,
  maxScore = null,
}: {
  lessonId: string;
  past: PastSubmission | null;
  gradingType?: GradingType;
  gradingUnit?: GradingUnit;
  maxScore?: number | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [link, setLink] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Only one trial is allowed — once a submission exists, the form is
  // replaced with a summary rather than staying open for another attempt.
  if (past) {
    return (
      <div className="mt-3 rounded-[var(--radius-sm)] bg-paper-100 p-3 text-sm">
        <p className="text-foreground">
          Submitted on {new Date(past.submitted_at).toLocaleDateString()}. Only 1 trial is allowed for this
          assignment, so this can&apos;t be resubmitted.
        </p>
        {past.link_url && (
          <a href={past.link_url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-ink-900 underline underline-offset-2">
            View submitted link
          </a>
        )}
        {past.status === "graded" ? (
          <p className="mt-1 text-foreground">
            Grade: <span className="font-medium">{formatGrade(past.grade, gradingType, gradingUnit, maxScore)}</span>
            {past.feedback && <span className="text-muted"> — {past.feedback}</span>}
          </p>
        ) : (
          <p className="mt-1 text-muted">Waiting for feedback.</p>
        )}
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-3">
      <p className="text-xs text-muted">Only 1 trial is allowed — check your work before submitting.</p>

      <textarea
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write your answer (optional if you're attaching a file or link)"
        className="w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-2 text-sm text-foreground"
      />
      <Input
        value={link}
        onChange={(e) => setLink(e.target.value)}
        placeholder="Link to your work (optional) — Google Drive, GitHub, etc."
      />
      <div>
        <label className="text-xs text-muted">Attach a file (optional) — document, PDF, or similar</label>
        <input ref={inputRef} type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.zip" className="mt-1 block text-sm text-muted" />
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <Button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const formData = new FormData();
            if (inputRef.current?.files?.[0]) formData.set("file", inputRef.current.files[0]);
            const res = await submitAssignment(lessonId, text, link, formData);
            if (res.error) setError(res.error);
            else router.refresh();
          })
        }
      >
        {pending ? "Submitting…" : "Submit assignment"}
      </Button>
    </div>
  );
}
