import { createElement } from 'react';

import { getLinkIcon } from '@/lib/link-icons';
import type { PublicPageData } from '@/server/page/queries';

type PublicLink = PublicPageData['links'][number];

/**
 * Card de link individual da página pública.
 *
 * Server Component (sem `'use client'`) — `<a>` puro com
 * `target="_blank" rel="noopener noreferrer"` (AC4 / arch §Security L2132).
 * Ícone resolvido por `lib/link-icons.ts` (Story 2.5); slug fora do catálogo
 * cai no fallback `link`. Usamos `createElement(...)` para evitar a regra
 * `react-hooks/static-components` (mesmo pattern do LinkRow.tsx:154, Story
 * 2.5). O atributo `data-link-id` é inerte hoje e antecipa o tracking de
 * clique da Story 4.1 sem acoplar agora.
 */
export function PublicLinkCard({ link }: { link: PublicLink }) {
  return (
    <li>
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-all hover:bg-accent hover:shadow-md"
        data-link-id={link.id}
      >
        {createElement(getLinkIcon(link.icon), {
          className: 'h-5 w-5 shrink-0',
          'aria-hidden': true,
        })}
        <span className="flex-1 truncate font-medium">{link.title}</span>
      </a>
    </li>
  );
}
