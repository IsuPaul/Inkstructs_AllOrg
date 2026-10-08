import { SiteFooter, SiteHeader } from "./site-header";

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return <><SiteHeader />{children}<SiteFooter /></>;
}
