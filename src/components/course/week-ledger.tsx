import { cn } from "@/lib/utils";

/**
 * The Inkstructs progress mark: a row of segments, one per week, filled in
 * like a ledger being checked off — not a circular donut. Deliberately
 * numbered because weeks genuinely are a sequence.
 */
export function WeekLedger({
  totalWeeks,
  completedWeeks,
  currentWeek,
  className,
}: {
  totalWeeks: number;
  completedWeeks: number;
  currentWeek?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-[3px]", className)}>
      {Array.from({ length: totalWeeks }, (_, i) => i + 1).map((week) => {
        const done = week <= completedWeeks;
        const active = week === currentWeek && !done;
        return (
          <div
            key={week}
            title={`Week ${week}`}
            className={cn(
              "h-[7px] flex-1 rounded-full transition-colors duration-300",
              done && "bg-accent shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)]",
              active && "bg-ink-500/35",
              !done && !active && "bg-paper-200"
            )}
          />
        );
      })}
    </div>
  );
}
