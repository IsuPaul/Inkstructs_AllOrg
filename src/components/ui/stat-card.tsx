import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "neutral",
  hint,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: "neutral" | "accent";
  hint?: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface p-5 shadow-[var(--shadow-xs)] transition-all hover:shadow-[var(--shadow-sm)]">
      <div
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-[10px]",
          tone === "accent" ? "bg-accent/15 text-amber-600" : "bg-paper-100 text-ink-700"
        )}
      >
        <Icon size={18} strokeWidth={1.75} />
      </div>
      <p className="mt-4 text-xs font-medium text-muted">{label}</p>
      <p className="font-display tabular-nums mt-1 text-[28px] leading-none text-foreground">{value}</p>
      {hint && <p className="mt-2 text-xs text-muted">{hint}</p>}
      <div
        className={cn(
          "pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-[0.07] transition-opacity group-hover:opacity-[0.12]",
          tone === "accent" ? "bg-accent" : "bg-ink-900"
        )}
      />
    </div>
  );
}
