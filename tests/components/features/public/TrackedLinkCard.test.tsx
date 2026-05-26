/**
 * Component tests — TrackedLinkCard (Story 4.1 AC6).
 *
 * Cobre:
 *   (a) Render — preserva atributos do PublicLinkCard subjacente (href,
 *       target, rel).
 *   (b) onClick → navigator.sendBeacon chamado com URL + Blob contendo link_id.
 *   (c) onClick com sendBeacon ausente → fetch fallback com keepalive: true.
 *   (d) onAuxClick (middle-click) dispara o mesmo handler.
 *
 * NÃO testamos preventDefault — o wrapper intencionalmente NÃO bloqueia
 * navegação (AC6 "não bloqueia navegação"). Em jsdom, click em <a> não
 * dispara navegação real (sem JSDOM nav), então a navegação é "preservada"
 * por ausência de preventDefault.
 */
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TrackedLinkCard } from '@/components/public/TrackedLinkCard';

type LinkProps = {
  id?: string;
  title?: string;
  url?: string;
  icon?: string | null;
  position?: number;
};

function makeLink(overrides: LinkProps = {}) {
  return {
    id: '22222222-2222-4222-8222-222222222222',
    title: 'Meu link rastreado',
    url: 'https://exemplo.com/tracked',
    icon: null as string | null,
    position: 0,
    ...overrides,
  };
}

describe('<TrackedLinkCard>', () => {
  let sendBeaconSpy: ReturnType<typeof vi.fn>;
  let originalSendBeacon: typeof navigator.sendBeacon | undefined;

  beforeEach(() => {
    // Captura sendBeacon original (pode não existir em jsdom 29)
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
  // (a) Preserva atributos do PublicLinkCard
  // ---------------------------------------------------------------------------
  it('(a) preserva href, target="_blank" e rel do <PublicLinkCard> subjacente', () => {
    render(
      <ul>
        <TrackedLinkCard link={makeLink({ title: 'Site oficial', url: 'https://exemplo.com' })} />
      </ul>,
    );
    const anchor = screen.getByRole('link', { name: /site oficial/i });
    expect(anchor).toHaveAttribute('target', '_blank');
    expect(anchor).toHaveAttribute('rel', 'noopener noreferrer');
    expect(anchor).toHaveAttribute('href', 'https://exemplo.com');
  });

  // ---------------------------------------------------------------------------
  // (b) onClick → sendBeacon chamado com URL + Blob com link_id
  // ---------------------------------------------------------------------------
  it('(b) onClick dispara navigator.sendBeacon com /api/track/click + Blob', async () => {
    const link = makeLink();
    render(
      <ul>
        <TrackedLinkCard link={link} />
      </ul>,
    );
    const anchor = screen.getByRole('link');

    // click bubbla até <span onClickCapture> do wrapper
    anchor.click();

    expect(sendBeaconSpy).toHaveBeenCalledTimes(1);
    const [url, body] = sendBeaconSpy.mock.calls[0]!;
    expect(url).toBe('/api/track/click');
    expect(body).toBeInstanceOf(Blob);

    // Lê o conteúdo do Blob via text() (async)
    const bodyText = await (body as Blob).text();
    expect(JSON.parse(bodyText)).toEqual({ link_id: link.id });
  });

  // ---------------------------------------------------------------------------
  // (c) fetch fallback quando sendBeacon ausente
  // ---------------------------------------------------------------------------
  it('(c) sem sendBeacon, usa fetch({ keepalive: true }) como fallback', () => {
    // Remove sendBeacon
    Object.defineProperty(navigator, 'sendBeacon', {
      value: undefined,
      configurable: true,
      writable: true,
    });

    const fetchSpy = vi.fn(() => Promise.resolve(new Response(null, { status: 204 })));
    vi.stubGlobal('fetch', fetchSpy);

    const link = makeLink();
    render(
      <ul>
        <TrackedLinkCard link={link} />
      </ul>,
    );
    screen.getByRole('link').click();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const args = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    const [url, init] = args;
    expect(url).toBe('/api/track/click');
    expect(init.method).toBe('POST');
    expect(init.keepalive).toBe(true);
    expect(init.body).toBe(JSON.stringify({ link_id: link.id }));
  });

  // ---------------------------------------------------------------------------
  // (d) onAuxClick (middle-click) também dispara
  // ---------------------------------------------------------------------------
  it('(d) middle-click (auxclick) dispara o mesmo handler', () => {
    render(
      <ul>
        <TrackedLinkCard link={makeLink()} />
      </ul>,
    );
    const anchor = screen.getByRole('link');

    // jsdom suporta MouseEvent('auxclick')
    const auxEvent = new MouseEvent('auxclick', {
      bubbles: true,
      cancelable: true,
      button: 1, // middle button
    });
    anchor.dispatchEvent(auxEvent);

    expect(sendBeaconSpy).toHaveBeenCalledTimes(1);
  });
});
