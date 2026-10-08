import Link from "next/link";
import { ArrowRight, BookOpen, ShieldCheck, UsersRound } from "lucide-react";
import { getOrganizationBySlug } from "@/lib/organizations";

export default async function EmbeddedDashboardPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const organization = await getOrganizationBySlug(orgSlug);
  if (!organization) return <main className="embed-error"><h1>Organization not found</h1><p>Check the dashboard link provided by your learning platform.</p></main>;
  const entryPath = `/org/${organization.slug}/enter`;
  return <main className="embed-shell" style={{ "--tenant-accent": organization.primary_color } as React.CSSProperties}><header className="embed-header">{organization.logo_url ? <img src={organization.logo_url} alt="" /> : <span className="embed-mark">{organization.name.charAt(0)}</span>}<strong>{organization.name}</strong><Link href={`/login?next=${encodeURIComponent(entryPath)}`}>Sign in <ArrowRight size={16} /></Link></header><section className="embed-hero"><div><p className="eyebrow">Learning dashboard</p><h1>Everything your learners need, in one place.</h1><p>Access courses, follow progress, submit work, and stay connected with your instructors.</p><Link href={`/login?next=${encodeURIComponent(entryPath)}`} className="button">Open dashboard <ArrowRight size={17} /></Link></div><div className="embed-feature-card"><div><BookOpen /><span><b>Courses</b><small>Learn at your pace</small></span></div><div><UsersRound /><span><b>Community</b><small>Stay connected</small></span></div><div><ShieldCheck /><span><b>Progress</b><small>See how far you’ve come</small></span></div></div></section><footer>Powered by Inkstructs</footer></main>;
}
