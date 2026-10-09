"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ICONS, type NavIconName } from "./nav-icons";
import { deploymentConfig } from "@/lib/deployment-config";

export type NavItem = {
  href: string;
  label: string;
  icon: NavIconName;
};

export function Sidebar({
  items,
  portalLabel,
  userName,
  userRole,
  badges,
  collapsed,
  onToggle,
}: {
  items: NavItem[];
  portalLabel: string;
  userName: string;
  userRole: string;
  badges?: Record<string, boolean>;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();
  const initial = userName.trim().charAt(0).toUpperCase() || "?";

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 hidden flex-col bg-ink-950 transition-[width] duration-200 md:flex",
        collapsed ? "w-20" : "w-64"
      )}
      style={{
        backgroundImage:
          "radial-gradient(ellipse 500px 300px at 0% 0%, rgba(232,163,61,0.08), transparent 60%), linear-gradient(180deg, #14162b 0%, #0e1024 100%)",
      }}
    >
      <div className={cn("flex h-16 items-center gap-2.5", collapsed ? "justify-center px-0" : "px-5")}>
        {deploymentConfig.logoUrl ? <img src={deploymentConfig.logoUrl} alt="" className="h-7 w-7 shrink-0 rounded-[7px] object-cover" /> : <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] bg-accent text-sm font-bold text-ink-950">I</span>}
        {!collapsed && (
          <>
            <span className="max-w-[145px] truncate text-[17px] font-bold tracking-tight text-paper-50">{deploymentConfig.name}</span>
            <span className="ml-auto rounded-full bg-white/[0.06] px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-wide text-ink-300">
              {portalLabel}
            </span>
          </>
        )}
      </div>

      <div className="mx-5 h-px bg-white/[0.07]" />

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = NAV_ICONS[item.icon];
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              aria-label={item.label}
              className={cn(
                "group relative flex items-center gap-3 rounded-[10px] py-2 text-sm font-medium transition-all",
                collapsed ? "justify-center px-0" : "px-3",
                active
                  ? "bg-gradient-to-r from-white/[0.09] to-white/[0.03] text-paper-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                  : "text-ink-300 hover:bg-white/[0.045] hover:text-paper-100"
              )}
            >
              <span
                className={cn(
                  "absolute -left-3 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-accent transition-opacity",
                  active ? "opacity-100" : "opacity-0"
                )}
              />
              <span className="relative shrink-0">
                <Icon size={collapsed ? 19 : 17} strokeWidth={1.75} />
                {badges?.[item.href] && (
                  <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-danger ring-2 ring-ink-950" />
                )}
              </span>
              {!collapsed && item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-2">
        <button
          onClick={onToggle}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "flex w-full items-center gap-3 rounded-[10px] py-2 text-sm font-medium text-ink-300 transition-colors hover:bg-white/[0.045] hover:text-paper-100",
            collapsed ? "justify-center px-0" : "px-3"
          )}
        >
          {collapsed ? <ChevronsRight size={19} strokeWidth={1.75} /> : <ChevronsLeft size={17} strokeWidth={1.75} />}
          {!collapsed && "Collapse"}
        </button>
      </div>

      <div className="mx-5 h-px bg-white/[0.07]" />

      <div
        className={cn("flex items-center gap-2.5 py-4", collapsed ? "justify-center px-0" : "px-5")}
        title={collapsed ? `${userName} · ${userRole}` : undefined}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-sm font-bold text-paper-50">
          {initial}
        </span>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-paper-50">{userName}</p>
            <p className="truncate text-xs capitalize text-ink-300">{userRole}</p>
          </div>
        )}
      </div>
    </aside>
  );
}
