import { notFound } from "next/navigation";
import { TopBar } from "@/components/shell/topbar";
import { createClient } from "@/lib/supabase/server";
import { CourseBuilder } from "@/components/builder/course-builder";

export default async function InstructorCourseBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: course } = await supabase.from("courses").select("id, title").eq("id", id).single();
  if (!course) notFound();

  const { data: weeks } = await supabase
    .from("weeks")
    .select(
      `id, week_number, title,
       modules(id, day_number, title, description, available_at,
         lessons(id, title, type, content_text, external_url, is_required, position, grading_type, grading_unit, max_score,
           assets(id, storage_path, mux_status)))`
    )
    .eq("course_id", id)
    .order("week_number");

  const sortedWeeks = (weeks ?? []).map((w) => ({
    ...w,
    modules: (w.modules ?? []).map((m) => ({
      ...m,
      lessons: [...(m.lessons ?? [])].sort((a, b) => a.position - b.position),
    })),
  }));

  return (
    <>
      <TopBar title={`Builder — ${course.title}`} />
      <div className="p-5 sm:p-8">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <CourseBuilder weeks={sortedWeeks as any} />
      </div>
    </>
  );
}
