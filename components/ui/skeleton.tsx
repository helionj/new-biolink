import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Skeleton primitive — Soft Studio Phase 4 (Story 5.8).
 *
 * Shimmer gradient sweep com prefers-reduced-motion fallback per spec
 * `docs/frontend-spec.md` §3.8 L1097-1122 verbatim:
 *   - `animate-shimmer` consome token `--animate-shimmer: shimmer 1.5s ease-in-out infinite`
 *     definido em `app/globals.css` @theme inline (AC1 Story 5.8).
 *   - Gradient `from-muted via-muted-foreground/20 to-muted` materializa
 *     `linear-gradient(90deg, var(--muted) 0%, var(--muted-foreground)/20 50%,
 *     var(--muted) 100%)` per spec L1107-1112.
 *   - `bg-[length:200%_100%]` permite background-position sweep -200% → 200%.
 *   - `motion-reduce:animate-none motion-reduce:bg-muted` consome Tailwind 4
 *     `motion-reduce:` variant (≡ `@media (prefers-reduced-motion: reduce)`)
 *     materializando spec §1.5.3 L328 + §4.5 L1191-1196 reduced-motion mandatory.
 *
 * Created per Constitution Art. IV-A (IDS — REUSE > ADAPT > CREATE):
 *   - REUSE: shadcn upstream Skeleton não consumido durante Story 5.3 audit (escopo
 *     fechado em 13 primitives pré-PRD v0.5 ratification de §3.8/§5.4).
 *   - ADAPT: local SkeletonBar em AnalyticsLoadingSkeleton.tsx era escoped a
 *     features/analytics — promover canonical primitive top-level provê
 *     capability shared cross-feature.
 *   - CREATE rationale: shimmer + motion-reduce fallback é new_capability não
 *     presente em `animate-pulse` Tailwind utility (opacity pulse) nem em local
 *     SkeletonBar; spec §3.8 + §5.4 explicit pedem `components/ui/skeleton.tsx`.
 *
 * Usage:
 *   ```tsx
 *   <Skeleton className="h-24" />               // metric card placeholder
 *   <Skeleton className="size-24 rounded-full" /> // avatar circle placeholder
 *   <Skeleton className="h-8 w-32" />           // h1 placeholder
 *   ```
 *
 * aria-hidden por default — skeletons são decoração visual; loaders consumers
 * (e.g., AnalyticsLoadingSkeleton) carregam aria-busy + aria-live + sr-only.
 */
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn(
        'animate-shimmer rounded-xl bg-gradient-to-r from-muted via-muted-foreground/20 to-muted bg-[length:200%_100%]',
        'motion-reduce:animate-none motion-reduce:bg-muted',
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
