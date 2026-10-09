import Link from "next/link";
import { ArrowRight, Award, PlayCircle, Sparkles, UsersRound } from "lucide-react";
import { SiteHeader } from "@/components/marketing/site-header";
import { HeroSlideshow } from "@/components/marketing/hero-slideshow";

export default function Home() {
  return <><SiteHeader /><main className="customer-landing">
    <section className="home-hero"><div className="marketing-container hero-grid"><div><p className="eyebrow">Your learning workspace</p><h1>Learn with a clear path to your <em>next chapter.</em></h1><p className="lede">Access your organization’s courses, cohorts, assignments, progress, and certificates in one focused learning dashboard.</p><div className="hero-actions"><Link href="/login" className="button">Sign in to dashboard <ArrowRight size={17} /></Link></div><div className="hero-proof"><span><UsersRound size={17} /> Instructor support</span><span><Award size={17} /> Certificates</span><span><PlayCircle size={17} /> Flexible access</span></div></div><div className="hero-visual"><HeroSlideshow /><div className="floating-note"><Sparkles size={17} /><span><strong>Learning that sticks</strong><small>One useful step at a time.</small></span></div></div></div></section>
  </main></>;
}
