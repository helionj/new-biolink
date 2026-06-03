/**
 * Component tests — <EmptyAnalyticsState> (Story 4.4 AC4 + Story 5.7 AC6 copy refresh).
 *
 * Cobre:
 *   (a) Texto verbatim spec §2.8 L801 — "Compartilhe sua página em /@<username> para
 *       começar a ver dados aqui." (Story 5.7 AC6 reconcile spec L801; com fallback
 *       "Compartilhe sua página para começar a ver dados aqui." se username vazio).
 *   (b) Heading "Sem analytics ainda" (DEV-15 ratificado @po; copy shipped Story 4.4).
 *   (c) Ilustração via BarChart3 icon (lucide-react) com aria-hidden.
 *   (d) CTA "Ver minha página pública" → siteUrl/@username com target=_blank rel.
 *   (e) Sem username → CTA omitida + copy fallback genérica (defense-in-depth).
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { EmptyAnalyticsState } from '@/components/analytics/EmptyAnalyticsState';

describe('<EmptyAnalyticsState>', () => {
  it('AC4 + AC6 — texto spec §2.8 L801 verbatim com username + heading + ícone aria-hidden', () => {
    const { container } = render(
      <EmptyAnalyticsState siteUrl="https://biolink.test" username="alice" />,
    );
    expect(
      screen.getByText('Compartilhe sua página em /@alice para começar a ver dados aqui.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Sem analytics ainda' }),
    ).toBeInTheDocument();
    // BarChart3 SVG existe e está aria-hidden.
    const svg = container.querySelector('svg[aria-hidden="true"]');
    expect(svg).not.toBeNull();
  });

  it('AC4 — CTA aponta para siteUrl/@username com target=_blank rel=noopener', () => {
    render(<EmptyAnalyticsState siteUrl="https://biolink.test" username="alice" />);
    const cta = screen.getByRole('link', { name: 'Ver minha página pública' });
    expect(cta.getAttribute('href')).toBe('https://biolink.test/@alice');
    expect(cta.getAttribute('target')).toBe('_blank');
    expect(cta.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('sem username → CTA omitida + copy fallback genérica', () => {
    render(<EmptyAnalyticsState siteUrl="https://biolink.test" username="" />);
    expect(screen.queryByRole('link', { name: 'Ver minha página pública' })).toBeNull();
    // Texto fallback (sem username) — defense-in-depth defense via condicional no component.
    expect(
      screen.getByText('Compartilhe sua página para começar a ver dados aqui.'),
    ).toBeInTheDocument();
  });
});
