export function PageFallback() {
  return (
    <div className="grid gap-4" aria-hidden>
      <div className="h-8 w-48 animate-pulse bg-muted" />
      <div className="h-64 animate-pulse bg-muted" />
      <div className="h-40 animate-pulse bg-muted" />
    </div>
  );
}
