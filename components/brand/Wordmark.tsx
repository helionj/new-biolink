import Link from 'next/link';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Wordmark primitive — Soft Studio Phase 5 (Story 5.9).
 *
 * Canonical brand mark "biolink ★" consumed across landing/auth/dashboard headers.
 * Spec `docs/frontend-spec.md` §1.6 L347-354 verbatim:
 *   - "biolink" all-lowercase (Q5 §6 L1407-1417 ratified — wordmark visual lowercase)
 *   - DM Sans Bold (700), tracking -0.04em
 *   - Color: `var(--primary)` (deep plum light/brand, lavender dark)
 *   - Sizes: sm (16) / md (24) / lg (40) per spec L351
 *   - ★ asterisco placeholder em `var(--accent)` peach (Q4 §6 L1395-1405 ratified;
 *     logomark real diferido Phase 2)
 *
 * Created per Constitution Art. IV-A IDS justified (REUSE > ADAPT > CREATE):
 *   - REUSE: shadcn upstream sem brand component canonical.
 *   - ADAPT: 3 inline wordmark patterns existentes em `app/page.tsx` +
 *     `app/(auth)/layout.tsx` + `app/dashboard/layout.tsx` (text-h3 lowercase)
 *     são canonical-promotable + DRY principle.
 *   - CREATE: new_capability — 3 size variants + showStar opt-out + href passthrough
 *     via next/link + aria-label "biolink" pure (★ aria-hidden decoração visual).
 *
 * Usage:
 *   ```tsx
 *   <Wordmark href="/" size="md" />            // landing/dashboard header (24px)
 *   <Wordmark size="sm" />                     // future small header (16px)
 *   <Wordmark size="lg" />                     // future footer landing (40px)
 *   <Wordmark showStar={false} />              // sem ★ asterisco
 *   ```
 *
 * Accessibility: aria-label="biolink" no Link wrapper carrega SR announcement;
 * ★ aria-hidden (decoração visual, não-semântica).
 */
const SIZE_CLASSES = {
  sm: 'text-base', // 16px per spec §1.6 L351 "16px header"
  md: 'text-2xl', // 24px per spec §1.6 L351 "24px sidebar dashboard"
  lg: 'text-[2.5rem]', // 40px per spec §1.6 L351 "40px footer landing"
};

type WordmarkProps = {
  size?: 'sm' | 'md' | 'lg';
  showStar?: boolean;
  className?: string;
  href?: string;
};

function Wordmark({ size = 'md', showStar = true, className, href }: WordmarkProps) {
  const content = (
    <span
      className={cn(
        'inline-flex items-baseline gap-1 font-bold tracking-[-0.04em] text-primary',
        SIZE_CLASSES[size],
        className,
      )}
    >
      <span>biolink</span>
      {showStar && (
        <span aria-hidden="true" className="text-accent">
          ★
        </span>
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
