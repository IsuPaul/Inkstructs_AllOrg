import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[var(--radius-md)] border border-dashed border-border-strong bg-surface/50 p-10 text-center">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-paper-100 text-ink-500">
        <Icon size={20} strokeWidth={1.75} />
      </div>
      <p className="font-display mt-4 text-lg text-foreground">{title}</p>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted">{description}</p>
    </div>
  );
}
