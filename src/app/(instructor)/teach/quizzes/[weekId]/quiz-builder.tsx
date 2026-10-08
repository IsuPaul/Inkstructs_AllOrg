"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { saveQuiz, type QuizQuestionInput } from "@/actions/quizzes";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

function emptyQuestion(): QuizQuestionInput {
  return {
    prompt: "",
    options: [
      { text: "", is_correct: true },
      { text: "", is_correct: false },
      { text: "", is_correct: false },
      { text: "", is_correct: false },
    ],
  };
}

export function QuizBuilder({
  weekId,
  weekTitle,
  initialTitle,
  initialInstructions,
  initialQuestions,
  initialAllowRetake,
}: {
  weekId: string;
  weekTitle: string;
  initialTitle: string;
  initialInstructions: string;
  initialQuestions: QuizQuestionInput[];
  initialAllowRetake: boolean;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle || `${weekTitle} quiz`);
  const [instructions, setInstructions] = useState(initialInstructions);
  const [allowRetake, setAllowRetake] = useState(initialAllowRetake);
  const [questions, setQuestions] = useState<QuizQuestionInput[]>(
    initialQuestions.length ? initialQuestions : [emptyQuestion()]
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function updateQuestion(i: number, patch: Partial<QuizQuestionInput>) {
    setQuestions((qs) => qs.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  }

  function updateOption(qi: number, oi: number, text: string) {
    setQuestions((qs) =>
      qs.map((q, idx) =>
        idx === qi ? { ...q, options: q.options.map((o, j) => (j === oi ? { ...o, text } : o)) } : q
      )
    );
  }

  function setCorrect(qi: number, oi: number) {
    setQuestions((qs) =>
      qs.map((q, idx) =>
        idx === qi ? { ...q, options: q.options.map((o, j) => ({ ...o, is_correct: j === oi })) } : q
      )
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Field label="Quiz title" htmlFor="quiz_title">
        <Input id="quiz_title" value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <Field label="Instructions (optional)" htmlFor="quiz_instructions">
        <textarea
          id="quiz_instructions"
          rows={2}
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          className="w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-2.5 text-sm text-foreground"
        />
      </Field>

      <label className="flex items-center gap-2 text-sm text-foreground">
        <input type="checkbox" checked={allowRetake} onChange={(e) => setAllowRetake(e.target.checked)} />
        Allow students to retake this quiz
      </label>

      <div className="space-y-5">
        {questions.map((q, qi) => (
          <div key={qi} className="rounded-[var(--radius-md)] border border-border bg-surface p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium text-muted">Question {qi + 1}</p>
              {questions.length > 1 && (
                <button
                  type="button"
                  onClick={() => setQuestions((qs) => qs.filter((_, idx) => idx !== qi))}
                  className="text-muted hover:text-danger"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>

            <Input
              className="mt-2"
              placeholder="Question text"
              value={q.prompt}
              onChange={(e) => updateQuestion(qi, { prompt: e.target.value })}
            />

            <div className="mt-3 space-y-2">
              {q.options.map((o, oi) => (
                <label key={oi} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`correct-${qi}`}
                    checked={o.is_correct}
                    onChange={() => setCorrect(qi, oi)}
                    className="accent-[var(--accent)]"
                  />
                  <Input
                    placeholder={`Option ${oi + 1}`}
                    value={o.text}
                    onChange={(e) => updateOption(qi, oi, e.target.value)}
                  />
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted">Select the radio next to the correct option.</p>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setQuestions((qs) => [...qs, emptyQuestion()])}
        className="flex items-center gap-1.5 text-sm text-ink-900 underline underline-offset-2"
      >
        <Plus size={15} /> Add another question
      </button>

      {error && <p className="text-sm text-danger">{error}</p>}

      <Button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const res = await saveQuiz(weekId, title, instructions, questions, allowRetake);
            if (res?.error) setError(res.error);
            else router.push("/teach/quizzes");
          })
        }
      >
        {pending ? "Saving…" : "Save quiz"}
      </Button>
    </div>
  );
}
