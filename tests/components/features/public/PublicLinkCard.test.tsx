/**
 * Component tests — PublicLinkCard (Story 2.7, AC3 + AC4).
 *
 * Cobre:
 *   (a) AC4 — `<a>` com target="_blank" + rel="noopener noreferrer".
 *   (b) AC3 — ícone do catálogo (slug='globe') resolvido por
 *       `lib/link-icons.ts` é renderizado como <svg>.
 *   (c) AC3 — fallback gracioso: icon=null e slug fora do catálogo ambos
 *       renderizam <svg> (fallback `link` em `getLinkIcon`).
 *
 * O <PublicPage> composite é coberto indiretamente via integration tests
 * (Task 8) — não duplicamos o data flow aqui.
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PublicLinkCard } from '@/components/public/PublicLinkCard';

type LinkProps = {
  id?: string;
  title?: string;
  url?: string;
  icon?: string | null;
  position?: number;
};

function makeLink(overrides: LinkProps = {}) {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    title: 'Meu link',
    url: 'https://exemplo.com',
    icon: null as string | null,
    position: 0,
    ...overrides,
  };
}

describe('<PublicLinkCard>', () => {
  it('(a) AC4 — <a> com target="_blank" e rel="noopener noreferrer"', () => {
    render(
      <ul>
        <PublicLinkCard link={makeLink({ title: 'Site oficial', url: 'https://exemplo.com' })} />
      </ul>,
    );

    const anchor = screen.getByRole('link', { name: /site oficial/i });
    expect(anchor).toHaveAttribute('target', '_blank');
    expect(anchor).toHaveAttribute('rel', 'noopener noreferrer');
    expect(anchor).toHaveAttribute('href', 'https://exemplo.com');
  });

  it('(b) AC3 — slug do catálogo (globe) resolve para um <svg> lucide', () => {
    const { container } = render(
      <ul>
        <PublicLinkCard link={makeLink({ icon: 'globe' })} />
      </ul>,
    );

    // Asserção genérica: lucide-react renderiza ícones como <svg>.
    // O catálogo de slug → componente é testado em `lib/link-icons.ts`.
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('(c) AC3 — icon=null OU slug inexistente → fallback (svg sempre presente)', () => {
    const { container: cNull } = render(
      <ul>
        <PublicLinkCard link={makeLink({ icon: null })} />
      </ul>,
    );
    expect(cNull.querySelector('svg')).toBeInTheDocument();

    const { container: cBad } = render(
      <ul>
        <PublicLinkCard link={makeLink({ icon: 'slug-inexistente-xyz' })} />
      </ul>,
    );
    expect(cBad.querySelector('svg')).toBeInTheDocument();
  });
});
