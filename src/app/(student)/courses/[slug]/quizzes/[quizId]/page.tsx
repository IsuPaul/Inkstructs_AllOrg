import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { TopBar } from "@/components/shell/topbar";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { TakeQuiz } from "./take-quiz";

export default async function QuizPage({
  params,
}: {
  params: Promise<{ slug: string; quizId: string }>;
}) {
  const { slug, quizId } = await params;
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: quizData, error } = await supabase.rpc("get_quiz_for_student", { p_quiz_id: quizId });
  if (error || !quizData) notFound();

  const { data: attempt } = await supabase
    .from("quiz_attempts")
    .select("score, total")
    .eq("quiz_id", quizId)
    .eq("student_id", profile.id)
    .maybeSingle();

  return (
    <>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <TopBar title={(quizData as any).title} />
      <div className="p-5 sm:p-8">
        <Link href={`/courses/${slug}`} className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
          <ArrowLeft size={15} /> Back to course
        </Link>
        <div className="mt-5">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <TakeQuiz quiz={quizData as any} previousScore={attempt ?? null} />
        </div>
      </div>
    </>
  );
}
