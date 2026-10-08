import Link from "next/link";
import { MobileMenu } from "./mobile-menu";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="marketing-container header-inner">
        <Link href="/" className="brand" aria-label="Inkstructs home">
          <span className="brand-mark">I</span><span>Inkstructs</span>
        </Link>
        <nav className="marketing-nav" aria-label="Main navigation">
          <div className="nav-dropdown"><Link href="/about">About</Link><div className="nav-dropdown-panel"><Link href="/about">Our approach</Link><Link href="/services">What we do</Link></div></div>
          <div className="nav-dropdown"><Link href="/services">Services</Link><div className="nav-dropdown-panel"><Link href="/services">Professional learning</Link><Link href="/contact">Work with us</Link></div></div>
          <div className="nav-dropdown"><Link href="/courses">Courses</Link><div className="nav-dropdown-panel"><Link href="/courses">Browse all courses</Link><Link href="/apply">Apply to learn</Link></div></div>
          <Link href="/contact">Contact</Link>
        </nav>
        <div className="header-actions">
          <Link href="/login" className="nav-login">Sign in</Link>
          <Link href="/apply" className="button button-small">Apply now</Link>
        </div>
        <MobileMenu />
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="marketing-container footer-grid">
        <div><Link href="/" className="brand"><span className="brand-mark">I</span><span>Inkstructs</span></Link><p>Practical learning for the work ahead.</p></div>
        <div><strong>Explore</strong><Link href="/about">About us</Link><Link href="/services">Services</Link><Link href="/courses">Courses</Link></div>
        <div><strong>Connect</strong><Link href="/contact">Contact</Link><a href="mailto:hello@inkstructs.com">hello@inkstructs.com</a><span>Riyadh · Online worldwide</span></div>
      </div>
      <div className="marketing-container footer-bottom"><span>© {new Date().getFullYear()} Inkstructs Limited</span><span>Built for curious minds.</span></div>
    </footer>
  );
}
