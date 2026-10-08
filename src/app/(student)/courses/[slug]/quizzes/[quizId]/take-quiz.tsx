"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

type Option = { id: string; text: string };
type Question = { id: string; prompt: string; options: Option[] };
type QuizData = {
  quiz_id: string;
  title: string;
  instructions: string | null;
  questions: Question[];
  allow_retake: boolean;
};

export function TakeQuiz({
  quiz,
  previousScore,
}: {
  quiz: QuizData;
  previousScore: { score: number; total: number } | null;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ score: number; total: number } | null>(previousScore);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const allAnswered = quiz.questions.every((q) => answers[q.id]);

  function submit() {
    startTransition(async () => {
      setError(null);
      const supabase = createClient();
      const { data, error } = await supabase.rpc("submit_quiz_attempt", {
        p_quiz_id: quiz.quiz_id,
        p_answers: quiz.questions.map((q) => ({
          question_id: q.id,
          selected_option_id: answers[q.id],
        })),
      });
      if (error) {
        setError(
          error.message?.includes("Retakes are not allowed")
            ? "Retakes are not allowed for this quiz."
            : "Couldn't submit your answers. Try again."
        );
        return;
      }
      setResult(data as { score: number; total: number });
    });
  }

  if (result) {
    const pct = result.total > 0 ? Math.round((result.score / result.total) * 100) : 0;
    return (
      <div className="max-w-md rounded-[var(--radius-md)] border border-border bg-surface p-8 text-center shadow-[var(--shadow-sm)]">
        <div
          className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full font-display tabular-nums text-xl ${
            pct >= 70 ? "bg-success/10 text-success" : "bg-accent/15 text-amber-600"
          }`}
        >
          {pct}%
        </div>
        <p className="mt-4 text-sm text-muted">Your score</p>
        <p className="font-display mt-1 text-3xl text-foreground">
          {result.score} / {result.total}
        </p>
        {quiz.allow_retake ? (
          <Button variant="secondary" className="mt-5" onClick={() => setResult(null)}>
            Retake quiz
          </Button>
        ) : (
          <p className="mt-4 text-xs text-muted">Retakes are not allowed for this quiz.</p>
        )}
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-5">
      {quiz.instructions && (
        <p className="rounded-[var(--radius-sm)] bg-paper-100 px-4 py-3 text-sm text-ink-700">{quiz.instructions}</p>
      )}

      {quiz.questions.map((q, i) => (
        <div key={q.id} className="rounded-[var(--radius-md)] border border-border bg-surface p-5 shadow-[var(--shadow-xs)]">
          <p className="text-sm font-medium text-foreground">
            <span className="text-muted">{i + 1}.</span> {q.prompt}
          </p>
          <div className="mt-3.5 space-y-2">
            {q.options.map((o) => {
              const selected = answers[q.id] === o.id;
              return (
                <label
                  key={o.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-[10px] border px-3.5 py-2.5 text-sm transition-all ${
                    selected
                      ? "border-ink-900 bg-ink-900 text-paper-50 shadow-[var(--shadow-xs)]"
                      : "border-border text-foreground hover:border-border-strong hover:bg-paper-100/60"
                  }`}
                >
                  <input
                    type="radio"
                    name={q.id}
                    checked={selected}
                    onChange={() => setAnswers((a) => ({ ...a, [q.id]: o.id }))}
                    className="sr-only"
                  />
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                      selected ? "border-accent" : "border-ink-300"
                    }`}
                  >
                    {selected && <span className="h-2 w-2 rounded-full bg-accent" />}
                  </span>
                  {o.text}
                </label>
              );
            })}
          </div>
        </div>
      ))}

      {error && <p className="text-sm text-danger">{error}</p>}

      <Button disabled={!allAnswered || pending} onClick={submit}>
        {pending ? "Submitting…" : "Submit answers"}
      </Button>
    </div>
  );
}
