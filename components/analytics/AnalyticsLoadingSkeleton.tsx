import { Skeleton } from '@/components/ui/skeleton';

export function AnalyticsLoadingSkeleton() {
  return (
    <div
      className="mx-auto max-w-4xl space-y-6"
      aria-busy="true"
      aria-live="polite"
      data-testid="analytics-loading"
    >
      <span className="sr-only">Carregando analytics…</span>
      <Skeleton className="h-8 w-32" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-72" />
      <Skeleton className="h-64" />
    </div>
  );
}
