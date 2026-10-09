import Link from "next/link";
import { MobileMenu } from "./mobile-menu";
import { deploymentConfig } from "@/lib/deployment-config";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="marketing-container header-inner">
        <Link href="/" className="brand" aria-label={`${deploymentConfig.name} home`}>
          <span className="brand-mark">I</span><span>{deploymentConfig.name}</span>
        </Link>
        <MobileMenu />
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="marketing-container footer-grid">
        <div><Link href="/" className="brand"><span className="brand-mark">I</span><span>{deploymentConfig.name}</span></Link><p>Practical learning for the work ahead.</p></div>
        <div><strong>Workspace</strong><Link href="/login">Sign in</Link><Link href="/forgot-password">Reset password</Link></div>
        <div><strong>Need help?</strong><span>Contact your organization administrator.</span></div>
      </div>
      <div className="marketing-container footer-bottom"><span>© {new Date().getFullYear()} Inkstructs Limited</span><span>Built for curious minds.</span></div>
    </footer>
  );
}
