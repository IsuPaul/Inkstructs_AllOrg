export default function Loading() {
  return (
    <div className="p-5 sm:p-8">
      <div className="h-6 w-40 animate-pulse rounded bg-paper-100" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-[var(--radius-md)] border border-border bg-paper-100" />
        ))}
      </div>
    </div>
  );
}
