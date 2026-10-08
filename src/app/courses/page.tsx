import Link from "next/link";
import { ArrowRight, Clock3 } from "lucide-react";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { createClient } from "@/lib/supabase/server";

const fallbackCourseImages = [
  "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1200&q=85",
];

export default async function CoursesPage() {
  const supabase = await createClient();
  const { data: courses, error } = await supabase.from("courses").select("id, title, description, thumbnail_url, level, duration_weeks").eq("is_published", true).order("created_at", { ascending: false });
  return <MarketingShell><main><section className="page-hero"><div className="marketing-container"><p className="eyebrow">Learn with us</p><h1>Find your next <em>starting point.</em></h1><p className="lede">Cohort-based courses with live instruction, a clear weekly roadmap, and support all the way to completion.</p></div></section><section className="marketing-container courses-grid">{error ? <div className="empty-courses"><h2>Courses are being refreshed.</h2><p>Please check back shortly, or contact our team for the latest learning options.</p><Link href="/contact" className="button">Contact us <ArrowRight size={16} /></Link></div> : courses && courses.length > 0 ? courses.map((course, index) => { const image = course.thumbnail_url || fallbackCourseImages[index % fallbackCourseImages.length]; return <article className="course-marketing-card" key={course.id}><div className="course-image-placeholder" style={{ backgroundImage: `linear-gradient(180deg, rgba(14,16,36,.04) 25%, rgba(14,16,36,.78)), url(${image})`, backgroundSize: "cover", backgroundPosition: "center" }}><span>{course.level || "Featured course"}</span></div><div className="course-card-body"><p className="eyebrow">{course.level || "Inkstructs course"}</p><h2>{course.title}</h2><p>{course.description || "A practical, instructor-led learning experience designed to help you build useful skills."}</p><div className="course-meta"><span><Clock3 size={15} /> {course.duration_weeks} weeks</span><Link href="/apply">Apply now <ArrowRight size={15} /></Link></div></div></article>; }) : <div className="empty-courses"><h2>New courses are on the way.</h2><p>We are preparing the next set of learning experiences. Join the conversation to hear what is coming next.</p><Link href="/contact" className="button">Talk to our team <ArrowRight size={16} /></Link></div>}</section></main></MarketingShell>;
}
