import { cn } from "@/lib/utils";

type Tone = "neutral" | "amber" | "success" | "danger";

const TONES: Record<Tone, string> = {
  neutral: "bg-paper-100 text-ink-700 ring-1 ring-inset ring-border",
  amber: "bg-amber-400/15 text-amber-600 ring-1 ring-inset ring-amber-400/25",
  success: "bg-success/10 text-success ring-1 ring-inset ring-success/20",
  danger: "bg-danger/10 text-danger ring-1 ring-inset ring-danger/20",
};

const DOT: Record<Tone, string> = {
  neutral: "bg-ink-500",
  amber: "bg-amber-500",
  success: "bg-success",
  danger: "bg-danger",
};

export function StatusBadge({
  children,
  tone = "neutral",
  dot = false,
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        TONES[tone],
        className
      )}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", DOT[tone])} />}
      {children}
    </span>
  );
}
