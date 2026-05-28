import { cn } from '@/lib/utils';

function SkeletonBar({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} aria-hidden="true" />;
}

export function AnalyticsLoadingSkeleton() {
  return (
    <div
      className="mx-auto max-w-4xl space-y-6"
      aria-busy="true"
      aria-live="polite"
      data-testid="analytics-loading"
    >
      <span className="sr-only">Carregando analytics…</span>
      <SkeletonBar className="h-7 w-32" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <SkeletonBar key={i} className="h-24" />
        ))}
      </div>
      <SkeletonBar className="h-72" />
      <SkeletonBar className="h-64" />
    </div>
  );
}
