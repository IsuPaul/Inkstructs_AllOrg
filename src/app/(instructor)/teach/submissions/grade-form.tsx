"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { gradeSubmission } from "@/actions/submissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { GradingType, GradingUnit } from "@/lib/grading";

export function GradeForm({
  submissionId,
  gradingType,
  gradingUnit,
  maxScore,
  currentGrade,
}: {
  submissionId: string;
  gradingType: GradingType;
  gradingUnit: GradingUnit;
  maxScore: number | null;
  currentGrade: number | null;
}) {
  const router = useRouter();
  const [grade, setGrade] = useState(currentGrade !== null ? String(currentGrade) : "");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const suffix =
    gradingType === "fraction" && maxScore
      ? `/ ${maxScore}`
      : gradingType === "whole_number" && gradingUnit === "percentage"
      ? "%"
      : null;

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <Input
            type="number"
            min={0}
            max={gradingType === "fraction" ? maxScore ?? undefined : gradingUnit === "percentage" ? 100 : undefined}
            placeholder="Grade"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="w-20"
          />
          {suffix && <span className="text-sm text-muted">{suffix}</span>}
        </div>
        <Input
          placeholder="Feedback (optional)"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          className="flex-1"
        />
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
      <Button
        variant="secondary"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const res = await gradeSubmission(submissionId, grade ? Number(grade) : null, feedback);
            if (res.error) setError(res.error);
            else router.refresh();
          })
        }
      >
        {pending ? "Saving…" : "Save grade"}
      </Button>
    </div>
  );
}
