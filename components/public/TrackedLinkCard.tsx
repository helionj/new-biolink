'use client';

import type { ComponentProps } from 'react';

import { PublicLinkCard } from '@/components/public/PublicLinkCard';

type PublicLink = ComponentProps<typeof PublicLinkCard>['link'];

/**
 * Wrapper Client Component que dispara o beacon de tracking ao clicar/aux-clicar
 * em um link da página pública (Story 4.1 AC6).
 *
 * Composição (preserva o Server Component `PublicLinkCard` intacto): adiciona
 * um `<span>` no boundary client com handlers `onClickCapture`/`onAuxClickCapture`
 * (cobre middle-click). O `PublicLinkCard` continua renderizando o `<a target="_blank">`
 * — não há `preventDefault` aqui, navegação acontece normalmente.
 *
 * DEV-6 (ratificado por @po): AC6 verbatim diz "fetch beforeunload" mas o link
 * tem `target="_blank"` → a aba atual NÃO unloada → `beforeunload` literal não
 * dispara. `navigator.sendBeacon` é o primitivo canônico para fire-and-forget
 * de telemetria (não bloqueia navegação por design). Fallback `fetch` com
 * `keepalive: true` cobre embedded browsers raros sem sendBeacon. Semântica do
 * AC preservada: dispatch no click, sem bloquear navegação.
 */
export function TrackedLinkCard({ link }: { link: PublicLink }) {
  const fireBeacon = () => {
    const body = JSON.stringify({ link_id: link.id });
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon('/api/track/click', blob);
    } else if (typeof fetch !== 'undefined') {
      fetch('/api/track/click', {
        method: 'POST',
        body,
        keepalive: true,
        headers: { 'content-type': 'application/json' },
      }).catch(() => {
        /* fire-and-forget */
      });
    }
  };

  return (
    <span onClickCapture={fireBeacon} onAuxClickCapture={fireBeacon}>
      <PublicLinkCard link={link} />
    </span>
  );
}
