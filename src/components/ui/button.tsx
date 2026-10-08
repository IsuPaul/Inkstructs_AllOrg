import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-ink-900 text-paper-50 shadow-[var(--shadow-xs)] hover:bg-ink-800 hover:shadow-[var(--shadow-sm)] hover:-translate-y-px",
  secondary:
    "bg-paper-100 text-ink-900 border border-border hover:bg-paper-200 hover:border-border-strong",
  ghost: "text-ink-700 hover:bg-paper-100",
  danger: "bg-danger text-paper-50 shadow-[var(--shadow-xs)] hover:bg-[var(--red-600,#a63a26)] hover:shadow-[var(--shadow-sm)]",
};

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] px-4 py-2.5 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none",
        VARIANTS[variant],
        className
      )}
      {...props}
    />
  );
}
