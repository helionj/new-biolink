'use client';

import { useEffect } from 'react';

/**
 * Client-only beacon que dispara um POST para `/api/track/view` no mount da
 * página pública (Story 4.2 AC2/DEV-8). Renderiza `null` — invisível, zero
 * DOM impact.
 *
 * DEV-8 (ratificado por @po): tracking server-side direto no RSC violaria a
 * ISR `revalidate=60` da Story 2.7 (cache miss apenas ~1× a cada 60s →
 * undercount massivo). Arch §L443 sanciona explicitamente o uso do Route
 * Handler `/api/track/view` como fallback para esse cenário. Trade-off: ~50-100
 * bytes gz de JS adicional (monitorado em Task 7.5 vs `[STORY-3.5-F1]`).
 *
 * Dispatcher: `navigator.sendBeacon` primário (cross-browser, fire-and-forget,
 * não bloqueia navegação) + `fetch+keepalive` fallback (embedded browsers
 * raros). Mesmo padrão do `TrackedLinkCard` da 4.1.
 *
 * Dedup window de 30min é responsabilidade do server (lib/track.ts Task 4.3 +
 * /api/track/view Task 5). O cliente apenas dispara — não inspeciona resposta
 * (sendBeacon não expõe body/status).
 *
 * Re-trigger: `useEffect` deps `[pageId]` → dispara apenas no mount (e
 * re-dispara se pageId mudar, edge case improvável dado ISR estático por slug).
 */
export function ViewBeacon({ pageId }: { pageId: string }) {
  useEffect(() => {
    if (typeof navigator === 'undefined') return;

    const body = JSON.stringify({ page_id: pageId });

    if (typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon('/api/track/view', blob);
      return;
    }

    if (typeof fetch !== 'undefined') {
      fetch('/api/track/view', {
        method: 'POST',
        body,
        keepalive: true,
        headers: { 'content-type': 'application/json' },
      }).catch(() => {
        /* fire-and-forget */
      });
    }
  }, [pageId]);

  return null;
}
