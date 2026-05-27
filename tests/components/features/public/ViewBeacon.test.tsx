/**
 * Component tests — ViewBeacon (Story 4.2 AC2 / DEV-8).
 *
 * Cobre:
 *   (a) Mount → navigator.sendBeacon chamado com URL + Blob contendo page_id.
 *   (b) Mount sem sendBeacon → fetch fallback com keepalive: true.
 *   (c) Re-render com mesmo pageId → sendBeacon apenas 1× (mount, não update).
 *   (d) SSR-safe — typeof navigator === 'undefined' → 0 chamadas, 0 errors.
 *
 * NÃO testamos end-to-end com Route Handler — esse path é integration test
 * em tests/integration/api/track-view.test.ts (Task 5.7).
 */
import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ViewBeacon } from '@/components/public/ViewBeacon';

const TEST_PAGE_ID = '33333333-3333-4333-8333-333333333333';

describe('<ViewBeacon>', () => {
  let sendBeaconSpy: ReturnType<typeof vi.fn>;
  let originalSendBeacon: typeof navigator.sendBeacon | undefined;

  beforeEach(() => {
    originalSendBeacon = navigator.sendBeacon;
    sendBeaconSpy = vi.fn(() => true);
    Object.defineProperty(navigator, 'sendBeacon', {
      value: sendBeaconSpy,
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    if (originalSendBeacon) {
      Object.defineProperty(navigator, 'sendBeacon', {
        value: originalSendBeacon,
        configurable: true,
        writable: true,
      });
    }
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // (a) Mount → sendBeacon chamado com URL + Blob contendo page_id
  // ---------------------------------------------------------------------------
  it('(a) mount dispara navigator.sendBeacon com /api/track/view + Blob', async () => {
    render(<ViewBeacon pageId={TEST_PAGE_ID} />);

    expect(sendBeaconSpy).toHaveBeenCalledTimes(1);
    const [url, body] = sendBeaconSpy.mock.calls[0]!;
    expect(url).toBe('/api/track/view');
    expect(body).toBeInstanceOf(Blob);

    const bodyText = await (body as Blob).text();
    expect(JSON.parse(bodyText)).toEqual({ page_id: TEST_PAGE_ID });
  });

  // ---------------------------------------------------------------------------
  // (b) Sem sendBeacon → fetch fallback com keepalive: true
  // ---------------------------------------------------------------------------
  it('(b) sem sendBeacon, usa fetch({ keepalive: true }) como fallback', () => {
    Object.defineProperty(navigator, 'sendBeacon', {
      value: undefined,
      configurable: true,
      writable: true,
    });

    const fetchSpy = vi.fn(() => Promise.resolve(new Response(null, { status: 204 })));
    vi.stubGlobal('fetch', fetchSpy);

    render(<ViewBeacon pageId={TEST_PAGE_ID} />);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const args = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    const [url, init] = args;
    expect(url).toBe('/api/track/view');
    expect(init.method).toBe('POST');
    expect(init.keepalive).toBe(true);
    expect(init.body).toBe(JSON.stringify({ page_id: TEST_PAGE_ID }));
  });

  // ---------------------------------------------------------------------------
  // (c) Re-render com mesmo pageId → sendBeacon apenas 1× (mount, não update)
  // ---------------------------------------------------------------------------
  it('(c) re-render com mesmo pageId → sendBeacon apenas 1× (mount only)', () => {
    const { rerender } = render(<ViewBeacon pageId={TEST_PAGE_ID} />);
    expect(sendBeaconSpy).toHaveBeenCalledTimes(1);

    rerender(<ViewBeacon pageId={TEST_PAGE_ID} />);
    rerender(<ViewBeacon pageId={TEST_PAGE_ID} />);

    // Mesmo pageId em deps → useEffect não re-executa
    expect(sendBeaconSpy).toHaveBeenCalledTimes(1);
  });

  // ---------------------------------------------------------------------------
  // (d) SSR-safe — typeof navigator === 'undefined' → 0 chamadas, 0 errors
  // ---------------------------------------------------------------------------
  it('(d) SSR-safe — guard typeof navigator === "undefined" não quebra render', () => {
    // O useEffect SÓ roda no client (jsdom = client). A guarda existe para o
    // path em que algum dia o componente renderize em ambiente sem navigator
    // (e.g., bundler RSC build estático). Validação aqui: sem fetch global e
    // sem sendBeacon → componente renderiza null sem throw.
    Object.defineProperty(navigator, 'sendBeacon', {
      value: undefined,
      configurable: true,
      writable: true,
    });
    const originalFetch = globalThis.fetch;
    // @ts-expect-error — apagar fetch para forçar early return defensivo
    delete globalThis.fetch;

    try {
      const { container } = render(<ViewBeacon pageId={TEST_PAGE_ID} />);
      // Renderiza null — sem erros, sem throws
      expect(container.firstChild).toBeNull();
    } finally {
      if (originalFetch) {
        globalThis.fetch = originalFetch;
      }
    }
  });
});
