"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Sidebar, type NavItem } from "./sidebar";
import { MobileNav } from "./mobile-nav";

const STORAGE_KEY = "customer-dashboard-sidebar-collapsed";

export function DashboardShell({
  items,
  portalLabel,
  userName,
  userRole,
  badges,
  children,
}: {
  items: NavItem[];
  portalLabel: string;
  userName: string;
  userRole: string;
  badges?: Record<string, boolean>;
  children: React.ReactNode;
}) {
  // Owned here (not in Sidebar) because the page content's left margin has to
  // follow the sidebar's width, and both need the same value.
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") setCollapsed(true);
    } catch {
      // localStorage unavailable (private mode, etc.) — just stay expanded.
    }
  }, []);

  function toggle() {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        // Not persisted, still works for this session.
      }
      return next;
    });
  }

  return (
    <div className="min-h-dvh bg-background">
      <Sidebar
        items={items}
        portalLabel={portalLabel}
        userName={userName}
        userRole={userRole}
        badges={badges}
        collapsed={collapsed}
        onToggle={toggle}
      />
      <div className={cn("pb-16 transition-[margin] duration-200 md:pb-0", collapsed ? "md:ml-20" : "md:ml-64")}>
        {children}
      </div>
      <MobileNav items={items} badges={badges} />
    </div>
  );
}
