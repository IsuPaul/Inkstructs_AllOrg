import { notFound } from "next/navigation";
import { TopBar } from "@/components/shell/topbar";
import { createClient } from "@/lib/supabase/server";
import { QuizBuilder } from "./quiz-builder";

export default async function QuizBuilderPage({ params }: { params: Promise<{ weekId: string }> }) {
  const { weekId } = await params;
  const supabase = await createClient();

  const { data: week } = await supabase.from("weeks").select("id, title").eq("id", weekId).single();
  if (!week) notFound();

  const { data: quiz } = await supabase
    .from("quizzes")
    .select("id, title, instructions, allow_retake, quiz_questions(id, prompt, position, quiz_options(id, text, is_correct, position))")
    .eq("week_id", weekId)
    .maybeSingle();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const q = quiz as any;
  const initialQuestions =
    q?.quiz_questions
      ?.sort((a: { position: number }, b: { position: number }) => a.position - b.position)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((qq: any) => ({
        prompt: qq.prompt,
        options: qq.quiz_options
          .sort((a: { position: number }, b: { position: number }) => a.position - b.position)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((o: any) => ({ text: o.text, is_correct: o.is_correct })),
      })) ?? [];

  return (
    <>
      <TopBar title={`Quiz — ${week.title}`} />
      <div className="p-5 sm:p-8">
        <QuizBuilder
          weekId={weekId}
          weekTitle={week.title}
          initialTitle={q?.title ?? ""}
          initialInstructions={q?.instructions ?? ""}
          initialQuestions={initialQuestions}
          initialAllowRetake={q?.allow_retake ?? true}
        />
      </div>
    </>
  );
}
