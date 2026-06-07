import Link from 'next/link';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Wordmark primitive — Soft Studio Phase 5 + Phase 2 Logomark.
 *
 * Canonical brand mark "biolink ◯" consumed across landing/auth/dashboard headers.
 * Spec `docs/frontend-spec.md` §1.6 L347-354 verbatim:
 *   - "biolink" all-lowercase (Q5 §6 L1407-1417 ratified — wordmark visual lowercase)
 *   - DM Sans Bold (700), tracking -0.04em
 *   - Color: `var(--primary)` (deep plum light/brand, lavender dark)
 *   - Sizes: sm (16) / md (24) / lg (40) per spec L351
 *   - Symbol: spiral aberta peach (`var(--accent)`) — Phase 2 logomark adopted
 *     2026-06-06 via `[EPIC-5-PHASE2-LOGO]` (substitui ★ asterisco placeholder
 *     shipped Story 5.9). Concept A: espiral aberta clássica — forma geométrica
 *     pura que se abre, suggests crescimento/fluxo/abertura. Source SVG:
 *     `docs/brand-explore/concept-a-open-spiral.svg`.
 *
 * Created per Constitution Art. IV-A IDS justified (REUSE > ADAPT > CREATE):
 *   - REUSE: shadcn upstream sem brand component canonical.
 *   - ADAPT: Story 5.9 Wordmark base (3 size variants + showSymbol opt-out +
 *     href passthrough). Phase 2 swap is ★ text → inline SVG (decisão visual
 *     ratificada user 2026-06-06).
 *   - CREATE: new_capability — Phase 2 logomark identity.
 *
 * Usage:
 *   ```tsx
 *   <Wordmark href="/" size="md" />            // landing/dashboard header (24px)
 *   <Wordmark size="sm" />                     // future small header (16px)
 *   <Wordmark size="lg" />                     // future footer landing (40px)
 *   <Wordmark showSymbol={false} />            // sem spiral
 *   ```
 *
 * Accessibility: aria-label="biolink" no Link wrapper carrega SR announcement;
 * SVG spiral aria-hidden (decoração visual, não-semântica).
 */
const SIZE_CLASSES = {
  sm: 'text-base', // 16px per spec §1.6 L351 "16px header"
  md: 'text-2xl', // 24px per spec §1.6 L351 "24px sidebar dashboard"
  lg: 'text-[2.5rem]', // 40px per spec §1.6 L351 "40px footer landing"
};

const SYMBOL_SIZE = {
  sm: 'size-4', // 16px
  md: 'size-6', // 24px
  lg: 'size-10', // 40px
};

type WordmarkProps = {
  size?: 'sm' | 'md' | 'lg';
  showSymbol?: boolean;
  className?: string;
  href?: string;
};

function Wordmark({ size = 'md', showSymbol = true, className, href }: WordmarkProps) {
  const content = (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-bold tracking-[-0.04em] text-primary',
        SIZE_CLASSES[size],
        className,
      )}
    >
      <span>biolink</span>
      {showSymbol && (
        <svg
          viewBox="0 0 32 32"
          aria-hidden="true"
          data-testid="wordmark-symbol"
          className={cn(SYMBOL_SIZE[size], 'text-accent')}
        >
          <path
            d="M 16 16 m -6 0 a 6 6 0 1 1 12 0 a 4 4 0 1 1 -8 0 a 2 2 0 1 1 4 0"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      )}
    </span>
  );

  if (href) {
    return (
      <Link href={href} aria-label="biolink" className="inline-flex">
        {content}
      </Link>
    );
  }

  return content;
}

export { Wordmark };
