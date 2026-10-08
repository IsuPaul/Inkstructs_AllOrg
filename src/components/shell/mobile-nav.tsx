"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ICONS } from "./nav-icons";
import type { NavItem } from "./sidebar";

const VISIBLE_COUNT = 4;

export function MobileNav({ items, badges }: { items: NavItem[]; badges?: Record<string, boolean> }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  // Keep the bar itself to a fixed, thumb-friendly 5 slots regardless of how
  // many pages a role has — anything past the first 4 lives behind "More,"
  // which is what keeps Profile reachable even for roles with 8+ items.
  const visible = items.slice(0, VISIBLE_COUNT);
  const overflow = items.slice(VISIBLE_COUNT);
  const overflowActive = overflow.some((i) => isActive(i.href));
  const overflowHasBadge = overflow.some((i) => badges?.[i.href]);

  return (
    <>
      {moreOpen && (
        <div className="fixed inset-0 z-30 bg-ink-950/40 md:hidden" onClick={() => setMoreOpen(false)}>
          <div
            className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-surface p-2 shadow-[var(--shadow-lg)]"
            style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom, 0px))" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-2 mt-1.5 h-1 w-10 rounded-full bg-paper-200" />
            {overflow.map((item) => {
              const Icon = NAV_ICONS[item.icon];
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "relative flex items-center gap-3 rounded-[10px] px-4 py-3 text-sm transition-colors",
                    active ? "bg-paper-100 font-medium text-ink-900" : "text-ink-700"
                  )}
                >
                  <span className="relative">
                    <Icon size={18} strokeWidth={1.75} />
                    {badges?.[item.href] && (
                      <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-danger" />
                    )}
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <nav
        className="fixed inset-x-0 bottom-0 z-20 flex border-t border-border bg-surface/95 shadow-[0_-8px_24px_-16px_rgba(14,16,36,0.2)] backdrop-blur md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {visible.map((item) => {
          const active = isActive(item.href);
          const Icon = NAV_ICONS[item.icon];
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] transition-colors",
                active ? "text-ink-900" : "text-ink-300"
              )}
            >
              <span className="relative">
                <Icon size={19} strokeWidth={active ? 2.2 : 1.75} />
                {badges?.[item.href] && (
                  <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-danger ring-2 ring-surface" />
                )}
              </span>
              <span className={active ? "font-medium" : ""}>{item.label}</span>
            </Link>
          );
        })}

        {overflow.length > 0 && (
          <button
            onClick={() => setMoreOpen(true)}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] transition-colors",
              overflowActive ? "text-ink-900" : "text-ink-300"
            )}
          >
            <span className="relative">
              <MoreHorizontal size={19} strokeWidth={overflowActive ? 2.2 : 1.75} />
              {overflowHasBadge && (
                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-danger ring-2 ring-surface" />
              )}
            </span>
            <span className={overflowActive ? "font-medium" : ""}>More</span>
          </button>
        )}
      </nav>
    </>
  );
}
