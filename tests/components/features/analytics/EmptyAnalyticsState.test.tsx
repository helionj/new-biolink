/**
 * Component tests — <EmptyAnalyticsState> (Story 4.4 AC4).
 *
 * Cobre:
 *   (a) Texto verbatim PRD AC4 "Compartilhe sua página para começar a ver analytics".
 *   (b) Heading adicional "Sem analytics ainda" (DEV-15 ratificado @po).
 *   (c) Ilustração via BarChart3 icon (lucide-react) com aria-hidden.
 *   (d) CTA "Ver minha página pública" → siteUrl/@username com target=_blank rel.
 *   (e) Sem username → CTA omitida (defense-in-depth).
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { EmptyAnalyticsState } from '@/components/analytics/EmptyAnalyticsState';

describe('<EmptyAnalyticsState>', () => {
  it('AC4 — texto PRD verbatim + heading + ícone aria-hidden', () => {
    const { container } = render(
      <EmptyAnalyticsState siteUrl="https://biolink.test" username="alice" />,
    );
    expect(
      screen.getByText('Compartilhe sua página para começar a ver analytics.'),
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

  it('sem username → CTA omitida', () => {
    render(<EmptyAnalyticsState siteUrl="https://biolink.test" username="" />);
    expect(screen.queryByRole('link', { name: 'Ver minha página pública' })).toBeNull();
    // Texto principal continua presente.
    expect(
      screen.getByText('Compartilhe sua página para começar a ver analytics.'),
    ).toBeInTheDocument();
  });
});
