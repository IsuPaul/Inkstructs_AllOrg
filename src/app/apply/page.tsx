import { AuthShell } from "@/components/auth/auth-shell";
import { createClient } from "@/lib/supabase/server";
import { ApplyForm } from "./apply-form";

export default async function ApplyPage() {
  const supabase = await createClient();
  const { data: courses } = await supabase
    .from("courses")
    .select("id, title")
    .eq("is_published", true)
    .order("title");

  return (
    <AuthShell title="Apply for a course" subtitle="Tell us a bit about yourself. We review every application and reply by email.">
      <ApplyForm courses={courses ?? []} />
    </AuthShell>
  );
}
